'use server';

import { db } from '@/db';
import { inventory, transactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

interface StocktakeInput {
  productId: string;
  location: string;
  actualBoxQty: number;
  actualPcsQty: number;
  remark?: string;
}

export async function processStocktake(input: StocktakeInput) {
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

    const systemBoxes = existing?.boxQty || 0;
    const systemPcs = existing?.pcsQty || 0;

    // Calculate variance (actual - system)
    const boxVariance = input.actualBoxQty - systemBoxes;
    const pcsVariance = input.actualPcsQty - systemPcs;

    // Only process if there's a difference
    if (boxVariance === 0 && pcsVariance === 0) {
      return { success: true, message: 'No adjustment needed' };
    }

    if (existing) {
      // Update existing inventory to actual count
      await db.update(inventory)
        .set({
          boxQty: input.actualBoxQty,
          pcsQty: input.actualPcsQty,
        })
        .where(eq(inventory.id, existing.id));
    } else {
      // Create new inventory record if physical count > 0
      if (input.actualBoxQty > 0 || input.actualPcsQty > 0) {
        await db.insert(inventory).values({
          id: nanoid(),
          productId: input.productId,
          boxQty: input.actualBoxQty,
          pcsQty: input.actualPcsQty,
          location: input.location,
        });
      }
    }

    // Create transaction record with variance
    await db.insert(transactions).values({
      id: nanoid(),
      type: 'CHECK',
      productId: input.productId,
      boxQty: boxVariance,  // Store the adjustment, not absolute
      pcsQty: pcsVariance,
      toLocation: input.location,
      operatorId: session.user.id,
      remark: input.remark || `Stocktake: System ${systemBoxes}/${systemPcs} → Actual ${input.actualBoxQty}/${input.actualPcsQty}`,
    });

    revalidatePath('/ops/stocktake');
    revalidatePath('/dashboard');

    return {
      success: true,
      variance: { boxes: boxVariance, pcs: pcsVariance }
    };
  } catch (error) {
    console.error('Stocktake error:', error);
    return { error: 'Failed to process stocktake' };
  }
}
