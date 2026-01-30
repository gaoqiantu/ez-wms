'use server';

import { db } from '@/db';
import { locations } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

export async function getLocations() {
  return db.query.locations.findMany({
    orderBy: [asc(locations.sortOrder), asc(locations.code)],
  });
}

export async function createLocation(data: { code: string; name?: string }) {
  // Get max sort order
  const existing = await db.query.locations.findMany({
    orderBy: [asc(locations.sortOrder)],
  });
  const maxOrder = existing.length > 0
    ? Math.max(...existing.map(l => l.sortOrder || 0))
    : 0;

  await db.insert(locations).values({
    id: nanoid(),
    code: data.code,
    name: data.name || '',
    sortOrder: maxOrder + 1,
  });

  revalidatePath('/more/locations');
}

export async function updateLocation(id: string, data: { code?: string; name?: string; sortOrder?: number }) {
  await db.update(locations)
    .set(data)
    .where(eq(locations.id, id));

  revalidatePath('/more/locations');
}

export async function deleteLocation(id: string) {
  await db.delete(locations).where(eq(locations.id, id));
  revalidatePath('/more/locations');
}
