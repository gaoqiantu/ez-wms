'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { auth } from '@/lib/auth';
import { desc, like, or } from 'drizzle-orm';

const MAX_LIMIT = 20;
const DEFAULT_LIMIT = 10;

export async function searchProductsForPicker(query: string, limit = DEFAULT_LIMIT) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const normalized = query.trim();
  const safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

  return db.query.products.findMany({
    where: normalized
      ? or(
        like(products.itemCode, `%${normalized}%`),
        like(products.barcode, `%${normalized}%`),
        like(products.description, `%${normalized}%`)
      )
      : undefined,
    orderBy: [desc(products.createdAt)],
    limit: safeLimit,
  });
}
