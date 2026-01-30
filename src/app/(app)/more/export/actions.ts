'use server';

import { db } from '@/db';
import { products, inventory, transactions, users } from '@/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';

export async function getInventoryForExport() {
  const results = await db
    .select({
      sku: products.sku,
      name: products.name,
      brand: products.brand,
      spec: products.spec,
      color: products.color,
      location: inventory.location,
      boxQty: inventory.boxQty,
      pcsQty: inventory.pcsQty,
      pcsPerBox: products.pcsPerBox,
      areaPerPcs: products.areaPerPcs,
    })
    .from(inventory)
    .innerJoin(products, eq(inventory.productId, products.id))
    .orderBy(products.sku, inventory.location);

  return results.map(row => ({
    ...row,
    totalPcs: (row.boxQty || 0) * (row.pcsPerBox || 1) + (row.pcsQty || 0),
    totalArea: ((row.boxQty || 0) * (row.pcsPerBox || 1) + (row.pcsQty || 0)) * (row.areaPerPcs || 0),
  }));
}

export async function getTransactionsForExport(fromDate?: string, toDate?: string) {
  let whereClause = undefined;

  if (fromDate && toDate) {
    whereClause = and(
      gte(transactions.createdAt, new Date(fromDate)),
      lte(transactions.createdAt, new Date(toDate + 'T23:59:59'))
    );
  } else if (fromDate) {
    whereClause = gte(transactions.createdAt, new Date(fromDate));
  } else if (toDate) {
    whereClause = lte(transactions.createdAt, new Date(toDate + 'T23:59:59'));
  }

  const results = await db
    .select({
      createdAt: transactions.createdAt,
      type: transactions.type,
      sku: products.sku,
      productName: products.name,
      boxQty: transactions.boxQty,
      pcsQty: transactions.pcsQty,
      fromLocation: transactions.fromLocation,
      toLocation: transactions.toLocation,
      operatorName: users.name,
      remark: transactions.remark,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(users, eq(transactions.operatorId, users.id))
    .where(whereClause)
    .orderBy(desc(transactions.createdAt));

  return results.map(row => ({
    ...row,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString().replace('T', ' ').slice(0, 19) : '',
  }));
}

export async function getProductsForExport() {
  return db.query.products.findMany({
    orderBy: [products.sku],
  });
}
