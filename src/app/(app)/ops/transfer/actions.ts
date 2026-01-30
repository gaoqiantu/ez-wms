'use server';

import { db } from '@/db';
import { inventory, transactions, products } from '@/db/schema';
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
    // Get product for pcsPerBox
    const product = await db.query.products.findFirst({
      where: eq(products.id, input.productId),
    });
    const pcsPerBox = product?.pcsPerBox || 1;

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

    // Check if enough stock at source using total pieces
    const totalAvailable = (source.boxQty || 0) * pcsPerBox + (source.pcsQty || 0);
    const totalRequested = input.boxQty * pcsPerBox + input.pcsQty;
    if (totalRequested > totalAvailable) {
      return { error: 'Insufficient stock at source location' };
    }

    // Calculate new source inventory (convert to total pieces, subtract, convert back)
    const remainingPcs = totalAvailable - totalRequested;
    const newSourceBoxes = Math.floor(remainingPcs / pcsPerBox);
    const newSourcePcs = remainingPcs % pcsPerBox;

    // Check if destination inventory exists (before transaction)
    const destination = await db.query.inventory.findFirst({
      where: and(
        eq(inventory.productId, input.productId),
        eq(inventory.location, input.toLocation)
      ),
    });

    // Use database transaction for atomicity
    await db.transaction(async (tx) => {
      // Update or delete source inventory
      if (newSourceBoxes === 0 && newSourcePcs === 0) {
        await tx.delete(inventory).where(eq(inventory.id, source.id));
      } else {
        await tx.update(inventory)
          .set({
            boxQty: newSourceBoxes,
            pcsQty: newSourcePcs,
          })
          .where(eq(inventory.id, source.id));
      }

      // Update or create destination inventory
      if (destination) {
        await tx.update(inventory)
          .set({
            boxQty: (destination.boxQty || 0) + input.boxQty,
            pcsQty: (destination.pcsQty || 0) + input.pcsQty,
          })
          .where(eq(inventory.id, destination.id));
      } else {
        await tx.insert(inventory).values({
          productId: input.productId,
          boxQty: input.boxQty,
          pcsQty: input.pcsQty,
          location: input.toLocation,
        });
      }

      // Create transaction record
      await tx.insert(transactions).values({
        type: 'MOVE',
        productId: input.productId,
        boxQty: input.boxQty,
        pcsQty: input.pcsQty,
        fromLocation: input.fromLocation,
        toLocation: input.toLocation,
        operatorId: session.user.id,
        remark: input.remark || null,
      });
    });

    revalidatePath('/ops/transfer');
    revalidatePath('/dashboard');

    return { success: true };
  } catch (error) {
    console.error('Transfer error:', error);
    return { error: 'Failed to process transfer' };
  }
}
