'use server';

import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, or, like, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

const PAGE_SIZE = 20;

export async function getCustomers(search?: string, limit = PAGE_SIZE, offset = 0) {
  const session = await auth();
  if (!session?.user?.id) return [];

  if (search) {
    return db.query.customers.findMany({
      where: or(
        like(customers.name, `%${search}%`),
        like(customers.contactName, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.email, `%${search}%`),
        like(customers.billToAddress, `%${search}%`),
        like(customers.shipToAddress, `%${search}%`)
      ),
      orderBy: [desc(customers.createdAt)],
      limit,
      offset,
    });
  }
  return db.query.customers.findMany({
    orderBy: [desc(customers.createdAt)],
    limit,
    offset,
  });
}

export async function getCustomer(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.query.customers.findFirst({
    where: eq(customers.id, id),
  });
}

export async function createCustomer(data: {
  name: string;
  contactName?: string;
  billToAddress?: string;
  shipToAddress?: string;
  phone?: string;
  email?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  const id = nanoid();
  await db.insert(customers).values({
    id,
    name: data.name,
    contactName: data.contactName || null,
    address: data.billToAddress || data.shipToAddress || null,
    billToAddress: data.billToAddress || null,
    shipToAddress: data.shipToAddress || null,
    phone: data.phone || null,
    email: data.email || null,
  });

  revalidatePath('/more/customers');
  return { id };
}

export async function updateCustomer(id: string, data: {
  name?: string;
  contactName?: string;
  billToAddress?: string;
  shipToAddress?: string;
  phone?: string;
  email?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await db.update(customers).set({
    name: data.name,
    contactName: data.contactName,
    address: data.billToAddress || data.shipToAddress || null,
    billToAddress: data.billToAddress,
    shipToAddress: data.shipToAddress,
    phone: data.phone,
    email: data.email,
  }).where(eq(customers.id, id));

  revalidatePath('/more/customers');
  revalidatePath(`/more/customers/${id}`);
  return { success: true };
}

export async function deleteCustomer(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await db.delete(customers).where(eq(customers.id, id));
  revalidatePath('/more/customers');
  return { success: true };
}

export async function searchCustomers(query: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  return db.query.customers.findMany({
    where: or(
      like(customers.name, `%${query}%`),
      like(customers.contactName, `%${query}%`),
      like(customers.phone, `%${query}%`),
      like(customers.email, `%${query}%`),
      like(customers.billToAddress, `%${query}%`),
      like(customers.shipToAddress, `%${query}%`)
    ),
    orderBy: [desc(customers.createdAt)],
    limit: 10,
  });
}
