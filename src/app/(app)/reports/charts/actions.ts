'use server';

import { db } from '@/db';
import { transactions, products, inventory } from '@/db/schema';
import { eq, sql, gte, desc } from 'drizzle-orm';

export async function getDailyMovement(days: number = 7) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const results = await db
    .select({
      date: sql<string>`date(${transactions.createdAt})`,
      type: transactions.type,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(gte(transactions.createdAt, startDate))
    .groupBy(sql`date(${transactions.createdAt})`, transactions.type);

  // Transform to chart data
  const dateMap = new Map<string, { date: string; IN: number; OUT: number }>();

  // Initialize all dates
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().split('T')[0];
    dateMap.set(dateStr, { date: dateStr.slice(5), IN: 0, OUT: 0 });
  }

  // Fill in data
  results.forEach(r => {
    const entry = dateMap.get(r.date);
    if (entry && (r.type === 'IN' || r.type === 'OUT')) {
      entry[r.type] = r.count;
    }
  });

  return Array.from(dateMap.values());
}

export async function getTopProducts(limit: number = 10) {
  const results = await db
    .select({
      sku: products.sku,
      name: products.name,
      count: sql<number>`count(${transactions.id})`,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .groupBy(products.id, products.sku, products.name)
    .orderBy(desc(sql`count(${transactions.id})`))
    .limit(limit);

  return results;
}

export async function getStockByLocation() {
  const results = await db
    .select({
      location: inventory.location,
      totalPcs: sql<number>`sum(${inventory.boxQty} * coalesce((
        select ${products.pcsPerBox} from ${products} where ${products.id} = ${inventory.productId}
      ), 1) + ${inventory.pcsQty})`,
    })
    .from(inventory)
    .groupBy(inventory.location);

  return results.map(r => ({
    location: r.location,
    value: r.totalPcs || 0,
  }));
}
