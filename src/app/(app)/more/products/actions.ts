'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { like, or, desc } from 'drizzle-orm';

export async function getProducts(search?: string) {
  if (search) {
    return db.query.products.findMany({
      where: or(
        like(products.sku, `%${search}%`),
        like(products.name, `%${search}%`),
        like(products.brand, `%${search}%`)
      ),
      orderBy: [desc(products.createdAt)],
    });
  }
  return db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
  });
}
