'use server';

import { db } from '@/db';
import { products, inventory, locations } from '@/db/schema';
import { eq, like, or, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function getInventoryReport(search?: string, location?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  let query = db
    .select({
      id: inventory.id,
      itemCode: products.itemCode,
      description: products.description,
      priceEach: products.priceEach,
      location: inventory.location,
      boxQty: inventory.boxQty,
      pcsQty: inventory.pcsQty,
      pcsPerBox: products.pcsPerBox,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id));

  const results = await query;

  // Filter in memory for flexibility
  let filtered = results;

  if (search) {
    const searchLower = search.toLowerCase();
    filtered = filtered.filter(r =>
      r.itemCode.toLowerCase().includes(searchLower) ||
      (r.description || '').toLowerCase().includes(searchLower)
    );
  }

  if (location && location !== 'all') {
    filtered = filtered.filter(r => r.location === location);
  }

  // Calculate totals
  return filtered.map(row => ({
    ...row,
    totalPcs: (row.boxQty || 0) * (row.pcsPerBox || 1) + (row.pcsQty || 0),
  }));
}

export async function getLocationsForFilter() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  return db.query.locations.findMany({
    orderBy: (loc, { asc }) => [asc(loc.sortOrder)],
  });
}

export async function getInventorySummary() {
  const session = await auth();
  if (!session?.user?.id) {
    return { totalSku: 0, totalBoxes: 0, totalPcs: 0 };
  }
  const result = await db
    .select({
      totalSku: sql<number>`count(distinct ${products.id})`,
      totalBoxes: sql<number>`sum(${inventory.boxQty})`,
      totalPcs: sql<number>`sum(${inventory.pcsQty})`,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id));

  return result[0];
}
