'use server';

import { db } from '@/db';
import { customers, type Customer } from '@/db/schema';
import { eq, or, like, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

const PAGE_SIZE = 20;
const SEARCH_LIMIT = 10;

function isLegacyCustomersSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('bill_to_address') ||
    message.includes('ship_to_address') ||
    message.includes('billtoaddress') ||
    message.includes('shiptoaddress')
  );
}

function mapLegacyCustomer(row: {
  id: string;
  name: string;
  contactName: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}): Customer {
  return {
    ...row,
    billToAddress: row.address,
    shipToAddress: row.address,
  };
}

async function getCustomersLegacy(search?: string, limit = PAGE_SIZE, offset = 0): Promise<Customer[]> {
  const baseQuery = db
    .select({
      id: customers.id,
      name: customers.name,
      contactName: customers.contactName,
      address: customers.address,
      phone: customers.phone,
      email: customers.email,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers);

  const query = search
    ? baseQuery.where(
      or(
        like(customers.name, `%${search}%`),
        like(customers.contactName, `%${search}%`),
        like(customers.phone, `%${search}%`),
        like(customers.email, `%${search}%`),
        like(customers.address, `%${search}%`)
      )
    )
    : baseQuery;

  const rows = await query
    .orderBy(desc(customers.createdAt))
    .limit(limit)
    .offset(offset);

  return rows.map(mapLegacyCustomer);
}

async function getCustomerLegacy(id: string): Promise<Customer | null> {
  const rows = await db
    .select({
      id: customers.id,
      name: customers.name,
      contactName: customers.contactName,
      address: customers.address,
      phone: customers.phone,
      email: customers.email,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);

  return rows[0] ? mapLegacyCustomer(rows[0]) : null;
}

async function searchCustomersLegacy(query: string): Promise<Customer[]> {
  const normalized = query.trim();
  const baseQuery = db
    .select({
      id: customers.id,
      name: customers.name,
      contactName: customers.contactName,
      address: customers.address,
      phone: customers.phone,
      email: customers.email,
      createdAt: customers.createdAt,
      updatedAt: customers.updatedAt,
    })
    .from(customers);

  const queryWithFilter = normalized
    ? baseQuery.where(
      or(
        like(customers.name, `%${normalized}%`),
        like(customers.contactName, `%${normalized}%`),
        like(customers.phone, `%${normalized}%`),
        like(customers.email, `%${normalized}%`),
        like(customers.address, `%${normalized}%`)
      )
    )
    : baseQuery;

  const rows = await queryWithFilter
    .orderBy(desc(customers.createdAt))
    .limit(SEARCH_LIMIT);

  return rows.map(mapLegacyCustomer);
}

export async function getCustomers(search?: string, limit = PAGE_SIZE, offset = 0) {
  const session = await auth();
  if (!session?.user?.id) return [];

  try {
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
  } catch (error) {
    if (isLegacyCustomersSchemaError(error)) {
      return getCustomersLegacy(search, limit, offset);
    }
    console.error('Get customers error:', error);
    return [];
  }
}

export async function getCustomer(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    return db.query.customers.findFirst({
      where: eq(customers.id, id),
    });
  } catch (error) {
    if (isLegacyCustomersSchemaError(error)) {
      return getCustomerLegacy(id);
    }
    console.error('Get customer error:', error);
    return null;
  }
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

  const name = data.name?.trim();
  if (!name) {
    return { error: 'Customer name is required' };
  }

  const contactName = data.contactName?.trim() || null;
  const billToAddress = data.billToAddress?.trim() || null;
  const shipToAddress = data.shipToAddress?.trim() || null;
  const phone = data.phone?.trim() || null;
  const email = data.email?.trim() || null;
  const address = billToAddress || shipToAddress || null;

  const id = nanoid();
  try {
    try {
      await db.insert(customers).values({
        id,
        name,
        contactName,
        address,
        billToAddress,
        shipToAddress,
        phone,
        email,
      });
    } catch (error) {
      if (!isLegacyCustomersSchemaError(error)) {
        throw error;
      }

      // Backward compatibility for DBs that have not added bill_to_address/ship_to_address yet.
      await db.insert(customers).values({
        id,
        name,
        contactName,
        address,
        phone,
        email,
      });
    }

    revalidatePath('/more/customers');
    return { id };
  } catch (error) {
    console.error('Create customer error:', error);
    return { error: 'Failed to create customer' };
  }
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

  const name = data.name?.trim();
  if (data.name !== undefined && !name) {
    return { error: 'Customer name is required' };
  }

  const contactName = data.contactName?.trim() || null;
  const billToAddress = data.billToAddress?.trim() || null;
  const shipToAddress = data.shipToAddress?.trim() || null;
  const phone = data.phone?.trim() || null;
  const email = data.email?.trim() || null;
  const address = billToAddress || shipToAddress || null;

  try {
    try {
      await db.update(customers).set({
        name,
        contactName,
        address,
        billToAddress,
        shipToAddress,
        phone,
        email,
      }).where(eq(customers.id, id));
    } catch (error) {
      if (!isLegacyCustomersSchemaError(error)) {
        throw error;
      }

      await db.update(customers).set({
        name,
        contactName,
        address,
        phone,
        email,
      }).where(eq(customers.id, id));
    }

    revalidatePath('/more/customers');
    revalidatePath(`/more/customers/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update customer error:', error);
    return { error: 'Failed to update customer' };
  }
}

export async function deleteCustomer(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  try {
    await db.delete(customers).where(eq(customers.id, id));
    revalidatePath('/more/customers');
    return { success: true };
  } catch (error) {
    console.error('Delete customer error:', error);
    return { error: 'Failed to delete customer' };
  }
}

export async function searchCustomers(query: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const normalized = query.trim();

  try {
    return db.query.customers.findMany({
      where: normalized
        ? or(
          like(customers.name, `%${normalized}%`),
          like(customers.contactName, `%${normalized}%`),
          like(customers.phone, `%${normalized}%`),
          like(customers.email, `%${normalized}%`),
          like(customers.billToAddress, `%${normalized}%`),
          like(customers.shipToAddress, `%${normalized}%`)
        )
        : undefined,
      orderBy: [desc(customers.createdAt)],
      limit: SEARCH_LIMIT,
    });
  } catch (error) {
    if (isLegacyCustomersSchemaError(error)) {
      return searchCustomersLegacy(normalized);
    }
    console.error('Search customers error:', error);
    return [];
  }
}
