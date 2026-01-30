'use server';

import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';

export async function getDocuments(type?: string, status?: string) {
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
}

export async function updateDocumentStatus(id: string, status: 'pending' | 'completed') {
  await db.update(documents)
    .set({ status })
    .where(eq(documents.id, id));

  revalidatePath('/more/documents');
}

export async function deleteDocument(id: string) {
  await db.delete(documents).where(eq(documents.id, id));
  revalidatePath('/more/documents');
}
