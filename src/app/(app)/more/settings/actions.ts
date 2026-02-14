'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getSetting(key: string): Promise<string | null> {
  try {
    const session = await auth();
    if (!session?.user?.id) return null;

    const result = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });
    return result?.value ?? null;
  } catch {
    return null;
  }
}

export async function setSetting(key: string, value: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) return { error: 'Not authenticated' };

    const existing = await db.query.settings.findFirst({
      where: eq(settings.key, key),
    });

    if (existing) {
      await db.update(settings).set({ value }).where(eq(settings.id, existing.id));
    } else {
      await db.insert(settings).values({ id: nanoid(), key, value });
    }

    revalidatePath('/more/settings');
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save setting' };
  }
}

export async function getComboboxOptions(key: string): Promise<string[]> {
  const value = await getSetting(key);
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export async function addComboboxOption(key: string, option: string) {
  const options = await getComboboxOptions(key);
  if (!options.includes(option)) {
    options.push(option);
    await setSetting(key, JSON.stringify(options));
  }
}
