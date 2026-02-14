'use server';

import { db } from '@/db';
import { transactions, products, users } from '@/db/schema';
import { eq, desc, gte, lte, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

interface TransactionFilters {
  search?: string;
  type?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export async function getTransactions(filters: TransactionFilters = {}) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  const conditions = [];

  if (filters.fromDate) {
    conditions.push(gte(transactions.createdAt, new Date(filters.fromDate)));
  }
  if (filters.toDate) {
    conditions.push(lte(transactions.createdAt, new Date(filters.toDate + 'T23:59:59')));
  }
  if (filters.type && filters.type !== 'all') {
    conditions.push(eq(transactions.type, filters.type as 'IN' | 'OUT' | 'MOVE' | 'CHECK' | 'RETURN'));
  }

  const results = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(filters.limit || 50)
    .offset(filters.offset || 0);

  // Filter by search in memory
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    return results.filter(r =>
      r.itemCode.toLowerCase().includes(searchLower) ||
      (r.productDescription || '').toLowerCase().includes(searchLower)
    );
  }

  return results;
}
