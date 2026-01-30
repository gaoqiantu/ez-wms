'use server';

import { db } from '@/db';
import { inventory, transactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface TransferInput {
  productId: string;
  fromLocation: string;
  toLocation: string;
  boxQty: number;
  pcsQty: number;
  remark?: string;
}

export async function processTransfer(input: TransferInput) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  if (input.fromLocation === input.toLocation) {
    return { error: 'Source and destination cannot be the same' };
  }

  try {
    // Get source inventory
    const source = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.productId, input.productId),
        eq(inventory.location, input.fromLocation)
      ),
    });

    if (!source) {
      return { error: 'No inventory at source location' };
    }

    // Check if enough stock at source
    if ((source.boxQty || 0) < input.boxQty || (source.pcsQty || 0) < input.pcsQty) {
      return { error: 'Insufficient stock at source location' };
    }

    // Update source inventory (decrease)
    const newSourceBoxes = (source.boxQty || 0) - input.boxQty;
    const newSourcePcs = (source.pcsQty || 0) - input.pcsQty;

    if (newSourceBoxes === 0 && newSourcePcs === 0) {
      // Delete empty inventory record
      await db.delete(inventory).where(eq(inventory.id, source.id));
    } else {
      await db.update(inventory)
        .set({
          boxQty: newSourceBoxes,
          pcsQty: newSourcePcs,
        })
        .where(eq(inventory.id, source.id));
    }

    // Check if destination inventory exists
    const destination = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.productId, input.productId),
        eq(inventory.location, input.toLocation)
      ),
    });

    if (destination) {
      // Update existing destination inventory
      await db.update(inventory)
        .set({
          boxQty: (destination.boxQty || 0) + input.boxQty,
          pcsQty: (destination.pcsQty || 0) + input.pcsQty,
        })
        .where(eq(inventory.id, destination.id));
    } else {
      // Create new destination inventory record
      await db.insert(inventory).values({
        productId: input.productId,
        boxQty: input.boxQty,
        pcsQty: input.pcsQty,
        location: input.toLocation,
      });
    }

    // Create transaction record
    await db.insert(transactions).values({
      type: 'MOVE',
      productId: input.productId,
      boxQty: input.boxQty,
      pcsQty: input.pcsQty,
      fromLocation: input.fromLocation,
      toLocation: input.toLocation,
      operatorId: session.user.id,
      remark: input.remark || null,
    });

    revalidatePath('/ops/transfer');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Transfer error:', error);
    return { error: 'Failed to process transfer' };
  }
}
