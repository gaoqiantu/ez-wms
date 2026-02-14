'use server';

import { db } from '@/db';
import { invoices, invoiceItems, customers, products, inventory, transactions, settings } from '@/db/schema';
import { eq, like, or, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { addComboboxOption } from '../settings/actions';
import { calculateOutbound } from '@/lib/inventory';

// 1. getInvoices(search?, limit?, offset?) - list invoices with DB-level search + pagination
const PAGE_SIZE = 20;

export async function getInvoices(search?: string, limit = PAGE_SIZE, offset = 0) {
  const session = await auth();
  if (!session?.user?.id) return [];

  if (search) {
    const q = `%${search}%`;
    return db.query.invoices.findMany({
      where: or(
        like(invoices.billToName, q),
      ),
      orderBy: [desc(invoices.createdAt)],
      limit,
      offset,
    });
  }

  return db.query.invoices.findMany({
    orderBy: [desc(invoices.createdAt)],
    limit,
    offset,
  });
}

// 2. getInvoice(id) - get invoice with items
export async function getInvoice(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: { items: true },
  });
}

// 3. getNextInvoiceNumber() - read from settings
export async function getNextInvoiceNumber(): Promise<number> {
  const result = await db.query.settings.findFirst({
    where: eq(settings.key, 'invoice_next_number'),
  });
  return result?.value ? parseInt(result.value, 10) : 1001;
}

// Input type for creating/updating invoices
interface InvoiceInput {
  date: string;
  poNumber?: string;
  billTo: {
    customerId?: string;
    name: string;
    contactName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  shipTo: {
    customerId?: string;
    name: string;
    contactName?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  terms?: string;
  rep?: string;
  via?: string;
  ship?: string;
  items: {
    productId?: string;
    itemCode: string;
    description?: string;
    priceEach: number;
    quantity: number;
  }[];
  remark?: string;
}

// Helper: auto-create or reuse customer
async function resolveCustomer(
  info: InvoiceInput['billTo'],
  reuseId?: string | null,
): Promise<string | null> {
  if (info.customerId) return info.customerId;
  if (!info.name) return null;

  // Reuse if same name as bill-to customer already created
  if (reuseId) return reuseId;

  const id = nanoid();
  await db.insert(customers).values({
    id,
    name: info.name,
    contactName: info.contactName || null,
    address: info.address || null,
    phone: info.phone || null,
    email: info.email || null,
  });
  return id;
}

// Round to 2 decimal places for financial calculations
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// 4. createInvoice - uses transaction for atomicity + atomic invoice number increment
export async function createInvoice(data: InvoiceInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  // Validate date
  const parsedDate = new Date(data.date);
  if (isNaN(parsedDate.getTime())) {
    return { error: 'Invalid date' };
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Atomically get and increment invoice number
      const setting = await tx.query.settings.findFirst({
        where: eq(settings.key, 'invoice_next_number'),
      });
      const invoiceNo = setting?.value ? parseInt(setting.value, 10) : 1001;

      if (setting) {
        await tx.update(settings)
          .set({ value: (invoiceNo + 1).toString() })
          .where(eq(settings.id, setting.id));
      } else {
        await tx.insert(settings).values({
          id: nanoid(),
          key: 'invoice_next_number',
          value: (invoiceNo + 1).toString(),
        });
      }

      // Auto-save new customers
      let billToCustomerId: string | null = data.billTo.customerId || null;
      if (!billToCustomerId && data.billTo.name) {
        const id = nanoid();
        await tx.insert(customers).values({
          id,
          name: data.billTo.name,
          contactName: data.billTo.contactName || null,
          address: data.billTo.address || null,
          phone: data.billTo.phone || null,
          email: data.billTo.email || null,
        });
        billToCustomerId = id;
      }

      let shipToCustomerId: string | null = data.shipTo.customerId || null;
      if (!shipToCustomerId && data.shipTo.name) {
        if (data.shipTo.name === data.billTo.name && billToCustomerId) {
          shipToCustomerId = billToCustomerId;
        } else {
          const id = nanoid();
          await tx.insert(customers).values({
            id,
            name: data.shipTo.name,
            contactName: data.shipTo.contactName || null,
            address: data.shipTo.address || null,
            phone: data.shipTo.phone || null,
            email: data.shipTo.email || null,
          });
          shipToCustomerId = id;
        }
      }

      // Calculate total with rounding
      const total = round2(data.items.reduce((sum, item) => sum + round2(item.quantity * item.priceEach), 0));

      // Create invoice
      const invoiceId = nanoid();
      await tx.insert(invoices).values({
        id: invoiceId,
        invoiceNo,
        date: parsedDate,
        status: 'draft',
        billToCustomerId,
        billToName: data.billTo.name || null,
        billToContact: data.billTo.contactName || null,
        billToAddress: data.billTo.address || null,
        billToPhone: data.billTo.phone || null,
        billToEmail: data.billTo.email || null,
        shipToCustomerId,
        shipToName: data.shipTo.name || null,
        shipToContact: data.shipTo.contactName || null,
        shipToAddress: data.shipTo.address || null,
        shipToPhone: data.shipTo.phone || null,
        shipToEmail: data.shipTo.email || null,
        poNumber: data.poNumber || null,
        terms: data.terms || null,
        rep: data.rep || null,
        via: data.via || null,
        ship: data.ship || null,
        total,
        remark: data.remark || null,
        operatorId: session.user.id,
      });

      // Create invoice items
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        await tx.insert(invoiceItems).values({
          id: nanoid(),
          invoiceId,
          productId: item.productId || null,
          quantity: item.quantity,
          itemCode: item.itemCode,
          description: item.description || null,
          priceEach: item.priceEach,
          amount: round2(item.quantity * item.priceEach),
          sortOrder: i,
        });
      }

      return { id: invoiceId, invoiceNo };
    });

    // Auto-save combobox values (outside transaction — non-critical)
    if (data.terms) await addComboboxOption('terms_options', data.terms);
    if (data.rep) await addComboboxOption('rep_options', data.rep);
    if (data.via) await addComboboxOption('via_options', data.via);
    if (data.ship) await addComboboxOption('ship_options', data.ship);

    revalidatePath('/more/invoices');
    revalidatePath('/more/customers');
    return result;
  } catch (error) {
    console.error('Create invoice error:', error);
    return { error: 'Failed to create invoice' };
  }
}

// 5. updateInvoice - uses transaction, also updates customer IDs and auto-creates customers
export async function updateInvoice(id: string, data: InvoiceInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  // Validate date
  const parsedDate = new Date(data.date);
  if (isNaN(parsedDate.getTime())) {
    return { error: 'Invalid date' };
  }

  try {
    await db.transaction(async (tx) => {
      const existing = await tx.query.invoices.findFirst({
        where: eq(invoices.id, id),
      });

      if (!existing || existing.status !== 'draft') {
        throw new Error('Can only edit draft invoices');
      }

      // Auto-save new customers on update too
      let billToCustomerId: string | null = data.billTo.customerId || null;
      if (!billToCustomerId && data.billTo.name) {
        const custId = nanoid();
        await tx.insert(customers).values({
          id: custId,
          name: data.billTo.name,
          contactName: data.billTo.contactName || null,
          address: data.billTo.address || null,
          phone: data.billTo.phone || null,
          email: data.billTo.email || null,
        });
        billToCustomerId = custId;
      }

      let shipToCustomerId: string | null = data.shipTo.customerId || null;
      if (!shipToCustomerId && data.shipTo.name) {
        if (data.shipTo.name === data.billTo.name && billToCustomerId) {
          shipToCustomerId = billToCustomerId;
        } else {
          const custId = nanoid();
          await tx.insert(customers).values({
            id: custId,
            name: data.shipTo.name,
            contactName: data.shipTo.contactName || null,
            address: data.shipTo.address || null,
            phone: data.shipTo.phone || null,
            email: data.shipTo.email || null,
          });
          shipToCustomerId = custId;
        }
      }

      const total = round2(data.items.reduce((sum, item) => sum + round2(item.quantity * item.priceEach), 0));

      // Update invoice fields including customer IDs
      await tx.update(invoices).set({
        date: parsedDate,
        billToCustomerId,
        billToName: data.billTo.name || null,
        billToContact: data.billTo.contactName || null,
        billToAddress: data.billTo.address || null,
        billToPhone: data.billTo.phone || null,
        billToEmail: data.billTo.email || null,
        shipToCustomerId,
        shipToName: data.shipTo.name || null,
        shipToContact: data.shipTo.contactName || null,
        shipToAddress: data.shipTo.address || null,
        shipToPhone: data.shipTo.phone || null,
        shipToEmail: data.shipTo.email || null,
        poNumber: data.poNumber || null,
        terms: data.terms || null,
        rep: data.rep || null,
        via: data.via || null,
        ship: data.ship || null,
        total,
        remark: data.remark || null,
      }).where(eq(invoices.id, id));

      // Delete existing items and re-insert
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        await tx.insert(invoiceItems).values({
          id: nanoid(),
          invoiceId: id,
          productId: item.productId || null,
          quantity: item.quantity,
          itemCode: item.itemCode,
          description: item.description || null,
          priceEach: item.priceEach,
          amount: round2(item.quantity * item.priceEach),
          sortOrder: i,
        });
      }
    });

    // Auto-save combobox values
    if (data.terms) await addComboboxOption('terms_options', data.terms);
    if (data.rep) await addComboboxOption('rep_options', data.rep);
    if (data.via) await addComboboxOption('via_options', data.via);
    if (data.ship) await addComboboxOption('ship_options', data.ship);

    revalidatePath('/more/invoices');
    revalidatePath(`/more/invoices/${id}`);
    return { success: true };
  } catch (error) {
    console.error('Update invoice error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update invoice';
    return { error: message };
  }
}

// 6. deleteInvoice - with error handling
export async function deleteInvoice(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  try {
    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });

    if (!existing || existing.status !== 'draft') {
      return { error: 'Can only delete draft invoices' };
    }

    await db.transaction(async (tx) => {
      await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      await tx.delete(invoices).where(eq(invoices.id, id));
    });

    revalidatePath('/more/invoices');
    return { success: true };
  } catch (error) {
    console.error('Delete invoice error:', error);
    return { error: 'Failed to delete invoice' };
  }
}

// 7. completeInvoice - uses single transaction for check + deduct (no TOCTOU)
export async function completeInvoice(id: string, locationCode: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  try {
    await db.transaction(async (tx) => {
      const invoice = await tx.query.invoices.findFirst({
        where: eq(invoices.id, id),
        with: { items: true },
      });

      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status !== 'draft') throw new Error('Invoice already completed');

      // Check and deduct in a single pass within the transaction
      for (const item of invoice.items) {
        if (!item.productId) continue;

        const product = await tx.query.products.findFirst({
          where: eq(products.id, item.productId),
        });
        if (!product) throw new Error(`Product not found: ${item.itemCode}`);

        const inv = await tx.query.inventory.findFirst({
          where: (inv, { and, eq }) =>
            and(eq(inv.productId, item.productId!), eq(inv.location, locationCode)),
        });

        if (!inv) throw new Error(`No inventory for ${item.itemCode} at ${locationCode}`);

        const pcsPerBox = product.pcsPerBox || 1;
        const result = calculateOutbound(inv.boxQty, inv.pcsQty, pcsPerBox, 0, item.quantity);
        if (!result) throw new Error(`Insufficient stock for ${item.itemCode}`);

        // Deduct inventory immediately
        await tx.update(inventory).set({
          boxQty: result.newBoxes,
          pcsQty: result.newPcs,
        }).where(eq(inventory.id, inv.id));

        // Create OUT transaction
        await tx.insert(transactions).values({
          type: 'OUT',
          productId: item.productId,
          boxQty: 0,
          pcsQty: -item.quantity,
          fromLocation: locationCode,
          operatorId: session.user.id,
          remark: `Invoice #${invoice.invoiceNo}`,
        });
      }

      // Mark invoice as completed
      await tx.update(invoices).set({ status: 'completed' }).where(eq(invoices.id, id));
    });

    revalidatePath('/more/invoices');
    revalidatePath(`/more/invoices/${id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Complete invoice error:', error);
    const message = error instanceof Error ? error.message : 'Failed to complete invoice';
    return { error: message };
  }
}
