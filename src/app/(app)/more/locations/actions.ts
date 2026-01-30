'use server';

import { db } from '@/db';
import { locations, inventory } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function getLocations() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  return db.query.locations.findMany({
    orderBy: [asc(locations.sortOrder), asc(locations.code)],
  });
}

export async function createLocation(data: { code: string; name?: string }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

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
  return { success: true };
}

export async function updateLocation(id: string, data: { code?: string; name?: string; sortOrder?: number }) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await db.update(locations)
    .set(data)
    .where(eq(locations.id, id));

  revalidatePath('/more/locations');
  return { success: true };
}

export async function deleteLocation(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Get the location to check its code
  const location = await db.query.locations.findFirst({
    where: eq(locations.id, id),
  });
  if (!location) {
    return { error: 'Location not found' };
  }

  // Check for related inventory
  const relatedInventory = await db.query.inventory.findFirst({
    where: eq(inventory.location, location.code),
  });
  if (relatedInventory) {
    return { error: 'Cannot delete location with existing inventory' };
  }

  await db.delete(locations).where(eq(locations.id, id));
  revalidatePath('/more/locations');
  return { success: true };
}
