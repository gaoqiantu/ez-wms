'use server';

import { db } from '@/db';
import { inventory, transactions, products } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { calculateOutbound } from '@/lib/inventory';

interface OutboundInput {
  productId: string;
  boxQty: number;
  pcsQty: number;
  location: string;
  documentId?: string;
  remark?: string;
}

export async function processOutbound(input: OutboundInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get current inventory
    const existing = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.productId, input.productId),
        eq(inventory.location, input.location)
      ),
    });

    if (!existing) {
      return { error: 'No inventory at this location' };
    }

    // Get product for pcsPerBox
    const product = await db.query.products.findFirst({
      where: eq(products.id, input.productId),
    });

    if (!product) {
      return { error: 'Product not found' };
    }

    const pcsPerBox = product.pcsPerBox || 1;

    // Calculate new inventory with auto-unboxing
    const result = calculateOutbound(
      existing.boxQty || 0,
      existing.pcsQty || 0,
      pcsPerBox,
      input.boxQty,
      input.pcsQty
    );

    if (!result) {
      return { error: 'Insufficient stock' };
    }

    // Update inventory
    await db.update(inventory)
      .set({
        boxQty: result.newBoxes,
        pcsQty: result.newPcs,
      })
      .where(eq(inventory.id, existing.id));

    // Create transaction record (store as negative for outbound)
    await db.insert(transactions).values({
      type: 'OUT',
      productId: input.productId,
      boxQty: -input.boxQty,
      pcsQty: -input.pcsQty,
      fromLocation: input.location,
      documentId: input.documentId || null,
      operatorId: session.user.id,
      remark: input.remark || null,
    });

    revalidatePath('/ops/outbound');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Outbound error:', error);
    return { error: 'Failed to process outbound' };
  }
}
