'use server';

import { db } from '@/db';
import { products, inventory, locations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

interface ImportProductRow {
  sku: string;
  name: string;
  brand?: string;
  series?: string;
  spec?: string;
  color?: string;
  unit?: string;
  pcs_per_box?: string;
  area_per_pcs?: string;
}

interface ImportInventoryRow {
  sku: string;
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
    if (!row.sku || !row.name) {
      results.errors.push(`Missing required field: ${row.sku || 'unknown'}`);
      continue;
    }

    try {
      const existing = await db.query.products.findFirst({
        where: eq(products.sku, row.sku),
      });

      const productData = {
        sku: row.sku,
        name: row.name,
        brand: row.brand || null,
        series: row.series || null,
        spec: row.spec || null,
        color: row.color || null,
        unit: row.unit || 'Pcs',
        pcsPerBox: parseInt(row.pcs_per_box || '1') || 1,
        areaPerPcs: parseFloat(row.area_per_pcs || '0') || null,
        barcode: row.sku,
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
      results.errors.push(`${row.sku}: ${message}`);
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
    if (!row.sku || !row.location) {
      results.errors.push(`Missing required field: ${row.sku || 'unknown'}`);
      continue;
    }

    try {
      // Find product by SKU
      const product = await db.query.products.findFirst({
        where: eq(products.sku, row.sku),
      });

      if (!product) {
        results.errors.push(`Product not found: ${row.sku}`);
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
      results.errors.push(`${row.sku}: ${message}`);
    }
  }

  revalidatePath('/more/products');
  return results;
}
