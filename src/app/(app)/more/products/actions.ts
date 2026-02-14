'use server';

import { db } from '@/db';
import { products, inventory, transactions } from '@/db/schema';
import { like, or, desc, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function getProducts(search?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  if (search) {
    return db.query.products.findMany({
      where: or(
        like(products.itemCode, `%${search}%`),
        like(products.description, `%${search}%`)
      ),
      orderBy: [desc(products.createdAt)],
    });
  }
  return db.query.products.findMany({
    orderBy: [desc(products.createdAt)],
  });
}

export async function getProduct(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  return db.query.products.findFirst({
    where: eq(products.id, id),
  });
}

export async function createProduct(data: {
  itemCode: string;
  description?: string;
  priceEach?: number;
  unit?: string;
  pcsPerBox?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  const id = nanoid();
  const barcode = data.itemCode; // Use itemCode as barcode/QR content

  await db.insert(products).values({
    id,
    ...data,
    barcode,
  });

  revalidatePath('/more/products');
  return { id };
}

export async function updateProduct(id: string, data: {
  itemCode?: string;
  description?: string;
  priceEach?: number;
  unit?: string;
  pcsPerBox?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await db.update(products)
    .set({
      ...data,
      barcode: data.itemCode, // Keep barcode in sync with itemCode
    })
    .where(eq(products.id, id));

  revalidatePath('/more/products');
  revalidatePath(`/more/products/${id}`);
}

export async function deleteProduct(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Check for related inventory
  const relatedInventory = await db.query.inventory.findFirst({
    where: eq(inventory.productId, id),
  });
  if (relatedInventory) {
    return { error: 'Cannot delete product with existing inventory' };
  }

  // Check for related transactions
  const relatedTransaction = await db.query.transactions.findFirst({
    where: eq(transactions.productId, id),
  });
  if (relatedTransaction) {
    return { error: 'Cannot delete product with transaction history' };
  }

  await db.delete(products).where(eq(products.id, id));
  revalidatePath('/more/products');
  return { success: true };
}
