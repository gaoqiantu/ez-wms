'use server';

import { db } from '@/db';
import { inventory, transactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface ReturnInput {
  productId: string;
  boxQty: number;
  pcsQty: number;
  location: string;
  reason: string;
  documentId?: string;
  remark?: string;
}

export async function processReturn(input: ReturnInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  try {
    // Check if inventory record exists for this product + location
    const existing = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.productId, input.productId),
        eq(inventory.location, input.location)
      ),
    });

    if (existing) {
      // Update existing inventory (add returned items)
      await db.update(inventory)
        .set({
          boxQty: (existing.boxQty || 0) + input.boxQty,
          pcsQty: (existing.pcsQty || 0) + input.pcsQty,
        })
        .where(eq(inventory.id, existing.id));
    } else {
      // Create new inventory record
      await db.insert(inventory).values({
        productId: input.productId,
        boxQty: input.boxQty,
        pcsQty: input.pcsQty,
        location: input.location,
      });
    }

    // Create transaction record with reason in remark
    const remarkWithReason = input.remark
      ? `[${input.reason}] ${input.remark}`
      : `[${input.reason}]`;

    await db.insert(transactions).values({
      type: 'RETURN',
      productId: input.productId,
      boxQty: input.boxQty,
      pcsQty: input.pcsQty,
      toLocation: input.location,
      documentId: input.documentId || null,
      operatorId: session.user.id,
      remark: remarkWithReason,
    });

    revalidatePath('/ops/return');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Return error:', error);
    return { error: 'Failed to process return' };
  }
}
