'use server';

import { db } from '@/db';
import { products, inventory, locations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

interface ImportProductRow {
  item_code: string;
  description?: string;
  price_each?: string;
  unit?: string;
  pcs_per_box?: string;
}

interface ImportInventoryRow {
  item_code: string;
  location: string;
  box_qty: string;
  pcs_qty: string;
}

export async function importProducts(
  rows: ImportProductRow[],
  mode: 'add' | 'update' | 'upsert'
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { added: 0, updated: 0, skipped: 0, errors: ['Not authenticated'] };
  }

  const results = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    if (!row.item_code) {
      results.errors.push(`Missing required field: ${row.item_code || 'unknown'}`);
      continue;
    }

    try {
      const existing = await db.query.products.findFirst({
        where: eq(products.itemCode, row.item_code),
      });

      const productData = {
        itemCode: row.item_code,
        description: row.description || null,
        priceEach: parseFloat(row.price_each || '0') || 0,
        unit: row.unit || 'Pcs',
        pcsPerBox: parseInt(row.pcs_per_box || '1') || 1,
        barcode: row.item_code,
      };

      if (existing) {
        if (mode === 'add') {
          results.skipped++;
          continue;
        }
        await db.update(products)
          .set({ ...productData, updatedAt: new Date() })
          .where(eq(products.id, existing.id));
        results.updated++;
      } else {
        if (mode === 'update') {
          results.skipped++;
          continue;
        }
        await db.insert(products).values({
          id: nanoid(),
          ...productData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        results.added++;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`${row.item_code}: ${message}`);
    }
  }

  revalidatePath('/more/products');
  return results;
}

export async function importInventory(rows: ImportInventoryRow[]) {
  const session = await auth();
  if (!session?.user?.id) {
    return { added: 0, updated: 0, skipped: 0, errors: ['Not authenticated'] };
  }

  const results = { added: 0, updated: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    if (!row.item_code || !row.location) {
      results.errors.push(`Missing required field: ${row.item_code || 'unknown'}`);
      continue;
    }

    try {
      // Find product by itemCode
      const product = await db.query.products.findFirst({
        where: eq(products.itemCode, row.item_code),
      });

      if (!product) {
        results.errors.push(`Product not found: ${row.item_code}`);
        continue;
      }

      // Auto-create location if needed
      const existingLocation = await db.query.locations.findFirst({
        where: eq(locations.code, row.location),
      });

      if (!existingLocation) {
        await db.insert(locations).values({
          id: nanoid(),
          code: row.location,
          name: row.location,
          createdAt: new Date(),
        });
      }

      // Check for existing inventory
      const existingInv = await db.query.inventory.findFirst({
        where: and(
          eq(inventory.productId, product.id),
          eq(inventory.location, row.location)
        ),
      });

      const boxQty = parseInt(row.box_qty || '0') || 0;
      const pcsQty = parseInt(row.pcs_qty || '0') || 0;

      if (existingInv) {
        await db.update(inventory)
          .set({ boxQty, pcsQty, updatedAt: new Date() })
          .where(eq(inventory.id, existingInv.id));
        results.updated++;
      } else {
        await db.insert(inventory).values({
          id: nanoid(),
          productId: product.id,
          boxQty,
          pcsQty,
          location: row.location,
          updatedAt: new Date(),
        });
        results.added++;
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      results.errors.push(`${row.item_code}: ${message}`);
    }
  }

  revalidatePath('/more/products');
  return results;
}
