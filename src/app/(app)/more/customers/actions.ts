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
        like(customers.contactName, `%${search}%`)
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
  address?: string;
  phone?: string;
  email?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  const id = nanoid();
  await db.insert(customers).values({ id, ...data });

  revalidatePath('/more/customers');
  return { id };
}

export async function updateCustomer(id: string, data: {
  name?: string;
  contactName?: string;
  address?: string;
  phone?: string;
  email?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  await db.update(customers).set(data).where(eq(customers.id, id));

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
      like(customers.phone, `%${query}%`)
    ),
    orderBy: [desc(customers.createdAt)],
    limit: 10,
  });
}
