'use server';

import { db } from '@/db';
import { invoices, invoiceItems, customers, products, inventory, transactions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import { getSetting, setSetting, addComboboxOption } from '../settings/actions';
import { calculateOutbound } from '@/lib/inventory';

// 1. getInvoices(search?) - list all invoices, optionally filter by invoiceNo or billToName
export async function getInvoices(search?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const allInvoices = await db.query.invoices.findMany({
    orderBy: [desc(invoices.createdAt)],
  });

  if (!search) return allInvoices;

  const q = search.toLowerCase();
  return allInvoices.filter(inv =>
    inv.invoiceNo.toString().includes(q) ||
    (inv.billToName || '').toLowerCase().includes(q)
  );
}

// 2. getInvoice(id) - get invoice with items
export async function getInvoice(id: string) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: { items: true },
  });
  return invoice;
}

// 3. getNextInvoiceNumber() - read from settings
export async function getNextInvoiceNumber(): Promise<number> {
  const value = await getSetting('invoice_next_number');
  return value ? parseInt(value, 10) : 1001;
}

// Input type for creating/updating invoices
interface InvoiceInput {
  date: string; // ISO date string
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

// 4. createInvoice(data) - create invoice + items, auto-save customers, increment number
export async function createInvoice(data: InvoiceInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  try {
    // Get next invoice number
    const invoiceNo = await getNextInvoiceNumber();

    // Auto-save new customers (if no customerId but has a name)
    let billToCustomerId = data.billTo.customerId || null;
    if (!billToCustomerId && data.billTo.name) {
      const id = nanoid();
      await db.insert(customers).values({
        id,
        name: data.billTo.name,
        contactName: data.billTo.contactName || null,
        address: data.billTo.address || null,
        phone: data.billTo.phone || null,
        email: data.billTo.email || null,
      });
      billToCustomerId = id;
    }

    let shipToCustomerId = data.shipTo.customerId || null;
    if (!shipToCustomerId && data.shipTo.name) {
      // Check if same as billTo
      if (data.shipTo.name === data.billTo.name && billToCustomerId) {
        shipToCustomerId = billToCustomerId;
      } else {
        const id = nanoid();
        await db.insert(customers).values({
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

    // Calculate total
    const total = data.items.reduce((sum, item) => sum + (item.quantity * item.priceEach), 0);

    // Create invoice
    const invoiceId = nanoid();
    await db.insert(invoices).values({
      id: invoiceId,
      invoiceNo,
      date: new Date(data.date),
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
      await db.insert(invoiceItems).values({
        id: nanoid(),
        invoiceId,
        productId: item.productId || null,
        quantity: item.quantity,
        itemCode: item.itemCode,
        description: item.description || null,
        priceEach: item.priceEach,
        amount: item.quantity * item.priceEach,
        sortOrder: i,
      });
    }

    // Increment invoice number
    await setSetting('invoice_next_number', (invoiceNo + 1).toString());

    // Auto-save combobox values
    if (data.terms) await addComboboxOption('terms_options', data.terms);
    if (data.rep) await addComboboxOption('rep_options', data.rep);
    if (data.via) await addComboboxOption('via_options', data.via);
    if (data.ship) await addComboboxOption('ship_options', data.ship);

    revalidatePath('/more/invoices');
    revalidatePath('/more/customers');
    return { id: invoiceId, invoiceNo };
  } catch (error) {
    console.error('Create invoice error:', error);
    return { error: 'Failed to create invoice' };
  }
}

// 5. updateInvoice(id, data) - update draft invoice
export async function updateInvoice(id: string, data: InvoiceInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  try {
    const existing = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
    });

    if (!existing || existing.status !== 'draft') {
      return { error: 'Can only edit draft invoices' };
    }

    const total = data.items.reduce((sum, item) => sum + (item.quantity * item.priceEach), 0);

    // Update invoice fields
    await db.update(invoices).set({
      date: new Date(data.date),
      billToName: data.billTo.name || null,
      billToContact: data.billTo.contactName || null,
      billToAddress: data.billTo.address || null,
      billToPhone: data.billTo.phone || null,
      billToEmail: data.billTo.email || null,
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
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      await db.insert(invoiceItems).values({
        id: nanoid(),
        invoiceId: id,
        productId: item.productId || null,
        quantity: item.quantity,
        itemCode: item.itemCode,
        description: item.description || null,
        priceEach: item.priceEach,
        amount: item.quantity * item.priceEach,
        sortOrder: i,
      });
    }

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
    return { error: 'Failed to update invoice' };
  }
}

// 6. deleteInvoice(id) - delete draft invoice only
export async function deleteInvoice(id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  const existing = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
  });

  if (!existing || existing.status !== 'draft') {
    return { error: 'Can only delete draft invoices' };
  }

  // Delete items first, then invoice
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  await db.delete(invoices).where(eq(invoices.id, id));

  revalidatePath('/more/invoices');
  return { success: true };
}

// 7. completeInvoice(id, locationCode) - mark complete and deduct inventory
export async function completeInvoice(id: string, locationCode: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  try {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: { items: true },
    });

    if (!invoice) return { error: 'Invoice not found' };
    if (invoice.status !== 'draft') return { error: 'Invoice already completed' };

    // Check stock for each item
    for (const item of invoice.items) {
      if (!item.productId) continue;

      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (!product) return { error: `Product not found: ${item.itemCode}` };

      const inv = await db.query.inventory.findFirst({
        where: (inv, { and, eq }) =>
          and(eq(inv.productId, item.productId!), eq(inv.location, locationCode)),
      });

      if (!inv) return { error: `No inventory for ${item.itemCode} at ${locationCode}` };

      const pcsPerBox = product.pcsPerBox || 1;
      // item.quantity is in pieces for invoice purposes
      const result = calculateOutbound(inv.boxQty, inv.pcsQty, pcsPerBox, 0, item.quantity);
      if (!result) return { error: `Insufficient stock for ${item.itemCode}` };
    }

    // All checks passed — deduct inventory
    for (const item of invoice.items) {
      if (!item.productId) continue;

      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (!product) continue;

      const inv = await db.query.inventory.findFirst({
        where: (inv, { and, eq }) =>
          and(eq(inv.productId, item.productId!), eq(inv.location, locationCode)),
      });
      if (!inv) continue;

      const pcsPerBox = product.pcsPerBox || 1;
      const result = calculateOutbound(inv.boxQty, inv.pcsQty, pcsPerBox, 0, item.quantity);
      if (!result) continue;

      // Update inventory
      await db.update(inventory).set({
        boxQty: result.newBoxes,
        pcsQty: result.newPcs,
      }).where(eq(inventory.id, inv.id));

      // Create OUT transaction
      await db.insert(transactions).values({
        type: 'OUT',
        productId: item.productId,
        boxQty: 0,
        pcsQty: -item.quantity,
        fromLocation: locationCode,
        operatorId: session.user.id,
        remark: `Invoice #${invoice.invoiceNo}`,
      });
    }

    // Update invoice status
    await db.update(invoices).set({ status: 'completed' }).where(eq(invoices.id, id));

    revalidatePath('/more/invoices');
    revalidatePath(`/more/invoices/${id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error('Complete invoice error:', error);
    return { error: 'Failed to complete invoice' };
  }
}
