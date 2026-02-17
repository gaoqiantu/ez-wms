'use server';

import { db } from '@/db';
import { products, inventory, transactions, users } from '@/db/schema';
import { eq, or, like, desc } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function searchProduct(query: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const result = await db.query.products.findFirst({
    where: or(
      eq(products.itemCode, query),
      eq(products.barcode, query),
      like(products.description, `%${query}%`)
    ),
  });
  return result;
}

export async function getProductWithInventory(productId: string, location?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });

  if (!product) return null;

  let inv = null;
  if (location) {
    inv = await db.query.inventory.findFirst({
      where: (inv, { and, eq }) =>
        and(eq(inv.productId, productId), eq(inv.location, location)),
    });
  }

  return { product, inventory: inv };
}

export async function getLocations() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  return db.query.locations.findMany({
    orderBy: (loc, { asc }) => [asc(loc.sortOrder)],
  });
}

export async function getInventoryByProduct(productId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  return db.query.inventory.findMany({
    where: eq(inventory.productId, productId),
  });
}

// Combined action to eliminate waterfall requests
export async function searchProductWithInventory(query: string, location?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const product = await db.query.products.findFirst({
    where: or(
      eq(products.itemCode, query),
      eq(products.barcode, query),
      like(products.description, `%${query}%`)
    ),
  });

  if (!product) return null;

  let inv = null;
  if (location) {
    inv = await db.query.inventory.findFirst({
      where: (inv, { and, eq }) =>
        and(eq(inv.productId, product.id), eq(inv.location, location)),
    });
  }

  return { product, inventory: inv };
}

export type OperationType = 'IN' | 'OUT' | 'MOVE' | 'CHECK' | 'RETURN';

export interface OperationHistoryItem {
  id: string;
  type: OperationType;
  createdAt: Date | null;
  boxQty: number;
  pcsQty: number;
  fromLocation: string | null;
  toLocation: string | null;
  remark: string | null;
  itemCode: string;
  productDescription: string | null;
  operatorName: string;
}

export async function getOperationHistory(type: OperationType, limit = 20): Promise<OperationHistoryItem[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const safeLimit = Math.max(1, Math.min(limit, 100));

  const rows = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      createdAt: transactions.createdAt,
      boxQty: transactions.boxQty,
      pcsQty: transactions.pcsQty,
      fromLocation: transactions.fromLocation,
      toLocation: transactions.toLocation,
      remark: transactions.remark,
      itemCode: products.itemCode,
      productDescription: products.description,
      operatorName: users.name,
    })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .innerJoin(users, eq(transactions.operatorId, users.id))
    .where(eq(transactions.type, type))
    .orderBy(desc(transactions.createdAt))
    .limit(safeLimit);

  return rows as OperationHistoryItem[];
}
