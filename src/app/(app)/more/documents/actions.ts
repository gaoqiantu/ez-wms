'use server';

import { db } from '@/db';
import { documents, transactions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function getDocuments(type?: string, status?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  const conditions = [];

  if (type && type !== 'all') {
    conditions.push(eq(documents.type, type as 'PO' | 'ORDER' | 'RMA'));
  }
  if (status && status !== 'all') {
    conditions.push(eq(documents.status, status as 'pending' | 'completed'));
  }

  return db.query.documents.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    orderBy: [desc(documents.createdAt)],
  });
}

export async function createDocument(data: {
  type: 'PO' | 'ORDER' | 'RMA';
  partyName?: string;
  remark?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Generate doc number based on type
  const prefix = data.type === 'PO' ? 'PO' : data.type === 'ORDER' ? 'ORD' : 'RMA';
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const docNo = `${prefix}-${date}-${random}`;

  await db.insert(documents).values({
    id: nanoid(),
    docNo,
    type: data.type,
    status: 'pending',
    partyName: data.partyName || null,
    remark: data.remark || null,
  });

  revalidatePath('/more/documents');
  return { success: true };
}

export async function updateDocumentStatus(id: string, status: 'pending' | 'completed') {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  await db.update(documents)
    .set({ status })
    .where(eq(documents.id, id));

  revalidatePath('/more/documents');
  return { success: true };
}

export async function deleteDocument(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Not authenticated' };
  }

  // Check for related transactions
  const relatedTransaction = await db.query.transactions.findFirst({
    where: eq(transactions.documentId, id),
  });
  if (relatedTransaction) {
    return { error: 'Cannot delete document with linked transactions' };
  }

  await db.delete(documents).where(eq(documents.id, id));
  revalidatePath('/more/documents');
  return { success: true };
}
