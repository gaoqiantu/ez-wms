# Product Redesign & Invoice Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename product fields (SKU→Item Code, remove unused fields, add description/priceEach), add customer management, invoice system with auto-incrementing numbers, inventory deduction, and printable invoice layout.

**Architecture:** Server Actions + Drizzle ORM on SQLite/Turso. No REST APIs. New tables: customers, invoices, invoice_items, settings. Product table simplified. Invoice completion triggers outbound transactions for inventory deduction.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Drizzle ORM, Tailwind CSS 4, Radix UI, Sonner toasts, next-intl.

**Design Doc:** `docs/plans/2026-02-13-product-invoice-redesign.md`

---

## Task 1: Update Database Schema

**Files:**
- Modify: `src/db/schema.ts`

**Step 1: Update products table — rename sku→itemCode, remove fields, add new fields**

In `src/db/schema.ts`, replace the products table definition:

```typescript
// Products table
export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  itemCode: text('item_code').notNull().unique(),
  description: text('description'),
  priceEach: real('price_each').notNull().default(0),
  unit: text('unit').notNull().default('Pcs'),
  pcsPerBox: integer('pcs_per_box').notNull().default(1),
  barcode: text('barcode').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});
```

**Step 2: Add customers table**

```typescript
// Customers table
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  name: text('name').notNull(),
  contactName: text('contact_name'),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});
```

**Step 3: Add invoices table**

```typescript
// Invoices table
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  invoiceNo: integer('invoice_no').notNull().unique(),
  date: integer('date', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  status: text('status', { enum: ['draft', 'completed'] }).notNull().default('draft'),

  // Bill To (snapshot)
  billToCustomerId: text('bill_to_customer_id').references(() => customers.id),
  billToName: text('bill_to_name'),
  billToContact: text('bill_to_contact'),
  billToAddress: text('bill_to_address'),
  billToPhone: text('bill_to_phone'),
  billToEmail: text('bill_to_email'),

  // Ship To (snapshot)
  shipToCustomerId: text('ship_to_customer_id').references(() => customers.id),
  shipToName: text('ship_to_name'),
  shipToContact: text('ship_to_contact'),
  shipToAddress: text('ship_to_address'),
  shipToPhone: text('ship_to_phone'),
  shipToEmail: text('ship_to_email'),

  // Header fields
  poNumber: text('po_number'),
  terms: text('terms'),
  rep: text('rep'),
  via: text('via'),
  ship: text('ship'),

  // Totals
  total: real('total').notNull().default(0),

  remark: text('remark'),
  operatorId: text('operator_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});
```

**Step 4: Add invoice_items table**

```typescript
// Invoice Items table
export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id),
  productId: text('product_id').references(() => products.id),
  quantity: integer('quantity').notNull().default(0),
  itemCode: text('item_code').notNull(),
  description: text('description'),
  priceEach: real('price_each').notNull().default(0),
  amount: real('amount').notNull().default(0),
  sortOrder: integer('sort_order').notNull().default(0),
});
```

**Step 5: Add settings table**

```typescript
// Settings table
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});
```

**Step 6: Add relations for new tables**

```typescript
export const customersRelations = relations(customers, ({ many }) => ({
  billToInvoices: many(invoices, { relationName: 'billToCustomer' }),
  shipToInvoices: many(invoices, { relationName: 'shipToCustomer' }),
}));

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  billToCustomer: one(customers, {
    fields: [invoices.billToCustomerId],
    references: [customers.id],
    relationName: 'billToCustomer',
  }),
  shipToCustomer: one(customers, {
    fields: [invoices.shipToCustomerId],
    references: [customers.id],
    relationName: 'shipToCustomer',
  }),
  operator: one(users, {
    fields: [invoices.operatorId],
    references: [users.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  product: one(products, {
    fields: [invoiceItems.productId],
    references: [products.id],
  }),
}));
```

**Step 7: Add type exports for new tables**

```typescript
export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
```

**Step 8: Push schema to database**

Run: `pnpm db:push`
Expected: Schema synced successfully (may warn about data loss for dropped columns — acceptable for dev)

**Step 9: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: update product schema, add customers/invoices/settings tables"
```

---

## Task 2: Update Seed Script

**Files:**
- Modify: `src/db/seed.ts`

**Step 1: Update seed to add default settings**

Add after the locations seeding:

```typescript
import { settings } from './schema';

// Create default settings
await db.insert(settings).values({
  id: nanoid(),
  key: 'invoice_next_number',
  value: '1001',
}).onConflictDoNothing();

await db.insert(settings).values({
  id: nanoid(),
  key: 'terms_options',
  value: JSON.stringify(['COD', 'Net 14', 'Net 30']),
}).onConflictDoNothing();

console.log('Created default settings');
```

**Step 2: Run seed**

Run: `pnpm db:seed`
Expected: Seed complete (settings created)

**Step 3: Commit**

```bash
git add src/db/seed.ts
git commit -m "feat: add default settings to seed script"
```

---

## Task 3: Product Field Migration — Server Actions

**Files:**
- Modify: `src/app/(app)/ops/actions.ts`
- Modify: `src/app/(app)/more/products/actions.ts`

**Step 1: Update ops/actions.ts — replace sku/name references with itemCode/description**

In `searchProduct`: change `products.sku` → `products.itemCode`, remove `products.name` search, add `products.description` search.

In `searchProductWithInventory`: same changes.

The full updated `searchProduct`:
```typescript
export async function searchProduct(query: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }
  const result = await db.query.products.findFirst({
    where: or(
      eq(products.itemCode, query),
      eq(products.barcode, query),
      like(products.description, `%${query}%`)
    ),
  });
  return result;
}
```

Same pattern for `searchProductWithInventory` — replace `products.sku` with `products.itemCode`, `products.name` with `products.description`.

**Step 2: Update more/products/actions.ts**

`getProducts` search: replace `products.sku` → `products.itemCode`, `products.name` → `products.description`, remove `products.brand`.

`createProduct` data type: replace `sku/name/brand/series/spec/color/areaPerPcs` with `itemCode/description/priceEach`. Barcode synced from `data.itemCode`.

`updateProduct` data type: same field changes. Barcode synced from `data.itemCode`.

**Step 3: Verify build**

Run: `pnpm build` (expect type errors in UI files — that's OK, we fix those next)

**Step 4: Commit**

```bash
git add src/app/(app)/ops/actions.ts src/app/(app)/more/products/actions.ts
git commit -m "feat: migrate server actions from sku/name to itemCode/description"
```

---

## Task 4: Product Field Migration — UI Components

**Files:**
- Modify: `src/components/product/product-card.tsx`
- Modify: `src/app/(app)/more/products/product-form.tsx`
- Modify: `src/app/(app)/more/products/product-list.tsx`

**Step 1: Update product-card.tsx**

Replace all `product.sku` → `product.itemCode`, `product.name` → `product.description`. Remove `product.brand`, `product.spec`, `product.color`, `product.series` references.

Updated card body:
```tsx
<div className="space-y-1">
  <span className="font-mono text-sm font-medium">{product.itemCode}</span>
  {product.description && (
    <h3 className="font-medium">{product.description}</h3>
  )}
  <div className="text-sm text-muted-foreground">
    ${product.priceEach.toFixed(2)} / {product.unit}
  </div>
</div>
```

**Step 2: Update product-form.tsx**

Replace form fields: remove sku/name/brand/series/spec/color/areaPerPcs. Add itemCode/description/priceEach.

Updated formData state:
```typescript
const [formData, setFormData] = useState({
  itemCode: product?.itemCode || '',
  description: product?.description || '',
  priceEach: product?.priceEach || 0,
  unit: product?.unit || 'Pcs',
  pcsPerBox: product?.pcsPerBox || 1,
});
```

Validation: `if (!formData.itemCode)` instead of `if (!formData.sku || !formData.name)`.

Form fields: Item Code (required), Description, Price Each (number), Unit, Pcs/Box.

**Step 3: Update product-list.tsx**

Replace `product.sku` → `product.itemCode`, `product.name` → `product.description`. Remove brand badge, spec, color display.

**Step 4: Verify build compiles**

Run: `pnpm build` (may still have errors in other files — continue to next task)

**Step 5: Commit**

```bash
git add src/components/product/product-card.tsx src/app/(app)/more/products/product-form.tsx src/app/(app)/more/products/product-list.tsx
git commit -m "feat: update product UI components for itemCode/description"
```

---

## Task 5: Product Field Migration — Operation Forms

**Files:**
- Modify: `src/app/(app)/ops/inbound/inbound-form.tsx`
- Modify: `src/app/(app)/ops/outbound/outbound-form.tsx` (if exists, same pattern)
- Modify: `src/app/(app)/ops/transfer/transfer-form.tsx` (if exists, same pattern)
- Modify: `src/app/(app)/ops/stocktake/stocktake-form.tsx` (if exists, same pattern)
- Modify: `src/app/(app)/ops/return/return-form.tsx` (if exists, same pattern)

**Step 1: Update inbound-form.tsx**

Line 47: change `product.sku` → `product.itemCode` in the `handleLocationChange` re-search call.

All other forms follow the same pattern — wherever `product.sku` is used for re-searching after location change, replace with `product.itemCode`.

**Step 2: Check all operation forms for sku/name references**

Each form uses `<ProductCard>` (already updated) and calls `searchProductWithInventory` (already updated). The only manual reference is `product.sku` in the re-search calls.

**Step 3: Commit**

```bash
git add src/app/(app)/ops/
git commit -m "feat: update operation forms for itemCode field"
```

---

## Task 6: Product Field Migration — Reports & Charts

**Files:**
- Modify: `src/app/(app)/reports/inventory/actions.ts`
- Modify: `src/app/(app)/reports/inventory/inventory-report.tsx`
- Modify: `src/app/(app)/reports/transactions/actions.ts`
- Modify: `src/app/(app)/reports/transactions/transaction-list.tsx`
- Modify: `src/app/(app)/reports/charts/actions.ts`
- Modify: `src/app/(app)/reports/charts/charts-view.tsx`

**Step 1: Update inventory report actions**

In `getInventoryReport`, update select fields:
- `sku: products.sku` → `itemCode: products.itemCode`
- `name: products.name` → `description: products.description`
- Remove: `brand`, `spec`, `color`, `areaPerPcs`
- Add: `priceEach: products.priceEach`

Update filter logic: `r.sku` → `r.itemCode`, `r.name` → `(r.description || '')`.

Remove `totalArea` calculation.

In `getInventorySummary`: rename `totalSku` to `totalItems` (cosmetic).

**Step 2: Update inventory-report.tsx**

Update `InventoryItem` interface — replace `sku/name/brand/spec/color` with `itemCode/description/priceEach`. Remove `totalArea`.

Update display: `item.sku` → `item.itemCode`, `item.name` → `item.description`. Remove spec/color. Remove area display.

Update summary card label: "SKUs" → "Items".

**Step 3: Update transaction report actions**

In `getTransactions`, update select:
- `sku: products.sku` → `itemCode: products.itemCode`
- `productName: products.name` → `productDescription: products.description`

**Step 4: Update transaction-list.tsx**

Update `Transaction` interface: `sku` → `itemCode`, `productName` → `productDescription`.

Update display: `item.sku` → `item.itemCode`, `item.productName` → `item.productDescription`.

Update search filter: same field renames.

**Step 5: Update charts actions**

In `getTopProducts`: `products.sku` → `products.itemCode`, `products.name` → `products.description`.

**Step 6: Update charts-view.tsx**

Props interface: `sku` → `itemCode`, `name` → `description`.

YAxis dataKey: `"sku"` → `"itemCode"`. Tooltip formatter: `props.payload.name` → `props.payload.description`.

**Step 7: Commit**

```bash
git add src/app/(app)/reports/
git commit -m "feat: update reports and charts for itemCode/description"
```

---

## Task 7: Product Field Migration — Export & Import

**Files:**
- Modify: `src/app/(app)/more/export/actions.ts`
- Modify: `src/app/(app)/more/export/export-form.tsx`
- Modify: `src/app/(app)/more/products/import/actions.ts`
- Modify: `src/app/(app)/more/products/import/import-form.tsx`

**Step 1: Update export actions**

`getInventoryForExport`: replace select fields (sku→itemCode, name→description, remove brand/spec/color/areaPerPcs, add priceEach). Remove `totalArea`. Order by `products.itemCode`.

`getTransactionsForExport`: `sku: products.sku` → `itemCode: products.itemCode`, `productName: products.name` → `description: products.description`.

`getProductsForExport`: order by `products.itemCode`.

**Step 2: Update export-form.tsx headers**

Inventory export headers:
```typescript
{ key: 'itemCode', label: 'Item Code / 货号' },
{ key: 'description', label: 'Description / 描述' },
{ key: 'priceEach', label: 'Price Each / 单价' },
{ key: 'location', label: 'Location / 库位' },
{ key: 'boxQty', label: 'Boxes / 整箱' },
{ key: 'pcsQty', label: 'Pieces / 散片' },
{ key: 'totalPcs', label: 'Total Pcs / 总片数' },
```

Transaction export headers: `sku` → `itemCode`, `productName` → `description`.

Products export headers:
```typescript
{ key: 'itemCode', label: 'Item Code / 货号' },
{ key: 'description', label: 'Description / 描述' },
{ key: 'priceEach', label: 'Price Each / 单价' },
{ key: 'unit', label: 'Unit / 单位' },
{ key: 'pcsPerBox', label: 'Pcs/Box / 片/箱' },
```

**Step 3: Update import actions**

`ImportProductRow` interface: `sku` → `item_code`, `name` → `description`, add `price_each`. Remove brand/series/spec/color/area_per_pcs.

`importProducts`: update field mapping, search by `products.itemCode` instead of `products.sku`.

`importInventory`: search by `products.itemCode` instead of `products.sku`.

**Step 4: Update import-form.tsx template**

```typescript
const productsTemplate = {
  headers: ['item_code', 'description', 'price_each', 'unit', 'pcs_per_box'],
  rows: [
    { item_code: 'QZ-001', description: 'White Quartz Slab', price_each: '45.00', unit: 'Pcs', pcs_per_box: '1' },
    { item_code: 'QZ-002', description: 'Grey Marble Slab', price_each: '55.00', unit: 'Pcs', pcs_per_box: '1' },
  ],
};

const inventoryTemplate = {
  headers: ['item_code', 'location', 'box_qty', 'pcs_qty'],
  rows: [
    { item_code: 'QZ-001', location: 'A-01', box_qty: '10', pcs_qty: '2' },
  ],
};
```

**Step 5: Commit**

```bash
git add src/app/(app)/more/export/ src/app/(app)/more/products/import/
git commit -m "feat: update export/import for itemCode/description fields"
```

---

## Task 8: Product Field Migration — Print Labels & Remaining Files

**Files:**
- Modify: `src/app/(app)/more/products/print/print-form.tsx`
- Modify: `src/app/(app)/more/products/[id]/page.tsx`
- Modify: `src/app/(app)/more/products/page.tsx` (if it references sku/name)

**Step 1: Update print-form.tsx**

Replace all `product.sku` → `product.itemCode`, `product.name` → `product.description`. Remove `product.spec`, `product.color`, `product.brand` from label display.

QR code generation: `generateQRDataURL(product.sku, 150)` → `generateQRDataURL(product.itemCode, 150)`.

Filter: replace sku/name with itemCode/description.

Label content:
```tsx
<div className="font-bold truncate">{product.itemCode}</div>
{product.description && <div className="truncate">{product.description}</div>}
{product.pcsPerBox && <div>{product.pcsPerBox}pcs/box</div>}
<div>${product.priceEach.toFixed(2)}</div>
```

**Step 2: Update product [id] page (if it displays sku/name directly)**

Check and update any direct field references.

**Step 3: Verify full build passes**

Run: `pnpm build`
Expected: Build succeeds (all product field references updated)

**Step 4: Commit**

```bash
git add src/app/(app)/more/products/
git commit -m "feat: update print labels and product pages for new fields"
```

---

## Task 9: Update Translations

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`

**Step 1: Update en.json products section**

Replace:
```json
"products": {
  "title": "Products",
  "itemCode": "Item Code",
  "description": "Description",
  "priceEach": "Price Each",
  "unit": "Unit",
  "pcsPerBox": "Pcs/Box",
  "add": "Add",
  "edit": "Edit",
  "delete": "Delete",
  "deleteConfirm": "Are you sure you want to delete this product?"
}
```

**Step 2: Add new sections to en.json**

```json
"customers": {
  "title": "Customers",
  "name": "Business Name",
  "contactName": "Contact Name",
  "address": "Address",
  "phone": "Phone",
  "email": "Email",
  "add": "Add",
  "edit": "Edit",
  "delete": "Delete",
  "deleteConfirm": "Are you sure you want to delete this customer?",
  "searchPlaceholder": "Search customers..."
},
"invoices": {
  "title": "Invoices",
  "new": "New Invoice",
  "invoiceNo": "Invoice #",
  "date": "Date",
  "status": "Status",
  "draft": "Draft",
  "completed": "Completed",
  "billTo": "Bill To",
  "shipTo": "Ship To",
  "poNumber": "P.O. Number",
  "terms": "Terms",
  "rep": "Rep",
  "via": "Via",
  "ship": "Ship",
  "lineItems": "Line Items",
  "addItem": "Add Item",
  "quantity": "Qty",
  "itemCode": "Item Code",
  "description": "Description",
  "priceEach": "Price Each",
  "amount": "Amount",
  "total": "Total",
  "remark": "Remark",
  "saveDraft": "Save Draft",
  "completeAndPrint": "Complete & Print",
  "print": "Print",
  "deleteConfirm": "Are you sure you want to delete this invoice?",
  "insufficientStock": "Insufficient stock for some items",
  "selectCustomer": "Select or type customer...",
  "newCustomer": "New Customer"
}
```

**Step 3: Add More menu entries to en.json**

```json
"customers": "Customers",
"customersDesc": "Manage customer information",
"invoices": "Invoices",
"invoicesDesc": "Create and manage invoices"
```

**Step 4: Add settings entries to en.json**

```json
"invoiceStartNumber": "Invoice Starting Number",
"invoiceStartNumberDesc": "Next invoice number to be assigned"
```

**Step 5: Update zh.json with Chinese translations**

Mirror all the above changes with Chinese text.

**Step 6: Commit**

```bash
git add src/messages/
git commit -m "feat: add translations for customers, invoices, updated product fields"
```

---

## Task 10: Settings System — Server Actions

**Files:**
- Create: `src/app/(app)/more/settings/actions.ts`

**Step 1: Create settings server actions**

```typescript
'use server';

import { db } from '@/db';
import { settings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

export async function getSetting(key: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const result = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return result?.value ?? null;
}

export async function setSetting(key: string, value: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: 'Not authenticated' };

  const existing = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });

  if (existing) {
    await db.update(settings).set({ value }).where(eq(settings.id, existing.id));
  } else {
    await db.insert(settings).values({ id: nanoid(), key, value });
  }

  revalidatePath('/more/settings');
  return { success: true };
}

export async function getComboboxOptions(key: string): Promise<string[]> {
  const value = await getSetting(key);
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

export async function addComboboxOption(key: string, option: string) {
  const options = await getComboboxOptions(key);
  if (!options.includes(option)) {
    options.push(option);
    await setSetting(key, JSON.stringify(options));
  }
}
```

**Step 2: Update settings page to include invoice number config**

Update `src/app/(app)/more/settings/page.tsx` to pass current invoice number setting.

Update `src/app/(app)/more/settings/settings-form.tsx` to add an "Invoice Starting Number" input field.

**Step 3: Commit**

```bash
git add src/app/(app)/more/settings/
git commit -m "feat: add settings system with combobox options support"
```

---

## Task 11: Customer CRUD — Server Actions

**Files:**
- Create: `src/app/(app)/more/customers/actions.ts`

**Step 1: Create customer server actions**

```typescript
'use server';

import { db } from '@/db';
import { customers } from '@/db/schema';
import { eq, or, like, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';

export async function getCustomers(search?: string) {
  const session = await auth();
  if (!session?.user?.id) return [];

  if (search) {
    return db.query.customers.findMany({
      where: or(
        like(customers.name, `%${search}%`),
        like(customers.contactName, `%${search}%`)
      ),
      orderBy: [desc(customers.createdAt)],
    });
  }
  return db.query.customers.findMany({
    orderBy: [desc(customers.createdAt)],
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
```

**Step 2: Commit**

```bash
git add src/app/(app)/more/customers/actions.ts
git commit -m "feat: add customer CRUD server actions"
```

---

## Task 12: Customer CRUD — UI Pages

**Files:**
- Create: `src/app/(app)/more/customers/page.tsx`
- Create: `src/app/(app)/more/customers/customer-list.tsx`
- Create: `src/app/(app)/more/customers/customer-form.tsx`
- Create: `src/app/(app)/more/customers/new/page.tsx`
- Create: `src/app/(app)/more/customers/[id]/page.tsx`

**Step 1: Create customer list page**

`page.tsx` — server component that fetches customers and renders CustomerList.

`customer-list.tsx` — client component with search, list of customer cards (name, contact, phone), link to detail page. Pattern matches existing `product-list.tsx`.

**Step 2: Create customer form**

`customer-form.tsx` — client component with fields: Business Name (required), Contact Name, Address, Phone, Email. Save/Delete buttons. Pattern matches `product-form.tsx`.

**Step 3: Create new customer page**

`new/page.tsx` — renders Header + CustomerForm (no initial data).

**Step 4: Create customer detail page**

`[id]/page.tsx` — fetches customer by ID, renders Header + CustomerForm with existing data.

**Step 5: Verify pages render**

Run: `pnpm dev`, navigate to `/more/customers`
Expected: Empty customer list with Add button

**Step 6: Commit**

```bash
git add src/app/(app)/more/customers/
git commit -m "feat: add customer management UI pages"
```

---

## Task 13: Update More Menu — Add Customers & Invoices

**Files:**
- Modify: `src/app/(app)/more/page.tsx`

**Step 1: Add menu items for Customers and Invoices**

Import `Receipt` and `Contact` (or `Users2`) from lucide-react.

Add to `menuItems` array after the Products entry:

```typescript
{
  href: '/more/customers',
  icon: Contact,
  labelKey: 'customers',
  descKey: 'customersDesc',
  adminOnly: false,
},
{
  href: '/more/invoices',
  icon: Receipt,
  labelKey: 'invoices',
  descKey: 'invoicesDesc',
  adminOnly: false,
},
```

**Step 2: Commit**

```bash
git add src/app/(app)/more/page.tsx
git commit -m "feat: add Customers and Invoices to More menu"
```

---

## Task 14: Invoice CRUD — Server Actions

**Files:**
- Create: `src/app/(app)/more/invoices/actions.ts`

**Step 1: Create invoice server actions**

Key actions needed:
- `getInvoices(search?)` — list invoices with search
- `getInvoice(id)` — get invoice with items
- `getNextInvoiceNumber()` — read from settings, return next number
- `createInvoice(data)` — create invoice + items, auto-save new customers, auto-save combobox values, increment invoice number
- `updateInvoice(id, data)` — update draft invoice
- `deleteInvoice(id)` — delete draft invoice only
- `completeInvoice(id)` — mark complete, deduct inventory

`createInvoice` should:
1. Get next invoice number from settings
2. If billTo/shipTo has no customerId but has name, create new customer record
3. Insert invoice record
4. Insert all invoice_items (snapshot product fields)
5. Increment invoice_next_number setting
6. Auto-save any new combobox values (terms, rep, via, ship)

`completeInvoice` should:
1. Get invoice with items
2. For each item, find product, check inventory at a default location, deduct via outbound
3. Create `OUT` transactions for each line item
4. Update invoice status to 'completed'

**Step 2: Commit**

```bash
git add src/app/(app)/more/invoices/actions.ts
git commit -m "feat: add invoice CRUD and completion server actions"
```

---

## Task 15: Combobox Component

**Files:**
- Create: `src/components/form/combobox.tsx`

**Step 1: Create reusable combobox component**

A component that:
- Shows a text input with dropdown of saved options
- Filters options as you type
- Allows free text (not just selection)
- Accepts `options: string[]` and `onValueChange: (value: string) => void`

Use Radix `@radix-ui/react-select` or a simple combo of Input + dropdown div. Keep it simple — a text input that shows a filtered list below when focused.

```tsx
'use client';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function Combobox({ value, onChange, options, placeholder }: ComboboxProps) {
  // State for showing dropdown
  // Filter options by current value
  // Render Input + absolute dropdown list
  // On option click → set value
  // Allow free typing
}
```

**Step 2: Commit**

```bash
git add src/components/form/combobox.tsx
git commit -m "feat: add reusable combobox component for invoice fields"
```

---

## Task 16: Invoice UI — List Page

**Files:**
- Create: `src/app/(app)/more/invoices/page.tsx`
- Create: `src/app/(app)/more/invoices/invoice-list.tsx`

**Step 1: Create invoice list page**

`page.tsx` — server component, fetches invoices list.

`invoice-list.tsx` — client component showing:
- Search input
- "New Invoice" button
- List of invoice cards: Invoice #, Date, Bill To name, Total, Status badge (draft=yellow, completed=green)
- Tap card → navigate to detail

**Step 2: Commit**

```bash
git add src/app/(app)/more/invoices/page.tsx src/app/(app)/more/invoices/invoice-list.tsx
git commit -m "feat: add invoice list page"
```

---

## Task 17: Invoice UI — Create/Edit Form

**Files:**
- Create: `src/app/(app)/more/invoices/new/page.tsx`
- Create: `src/app/(app)/more/invoices/invoice-form.tsx`
- Create: `src/app/(app)/more/invoices/customer-select.tsx`
- Create: `src/app/(app)/more/invoices/line-items.tsx`

**Step 1: Create customer-select component**

A reusable component for Bill To / Ship To selection:
- Search input that queries `searchCustomers`
- Displays matching customer cards
- On select → fills in name/contact/address/phone/email fields
- Fields are editable after selection (for one-off changes)
- If no customer selected, user types manually → new customer created on save

**Step 2: Create line-items component**

A component managing the itemized table:
- "Add Item" button opens product scanner/search
- On product select → adds row with item code, description, price each
- Quantity input per row
- Amount = qty × price, auto-calculated
- Delete row button (X)
- Total shown at bottom

**Step 3: Create invoice-form**

The main form combining:
- Date picker + auto-generated Invoice #
- P.O. Number input
- Bill To customer-select
- Ship To customer-select
- Terms/Rep/Via/Ship comboboxes (load saved options)
- Line items component
- Total display
- Remark input
- "Save Draft" and "Complete & Print" buttons

**Step 4: Create new invoice page**

`new/page.tsx` — server component that fetches next invoice number, combobox options, and renders invoice-form.

**Step 5: Verify form renders**

Run: `pnpm dev`, navigate to `/more/invoices/new`
Expected: Invoice creation form renders with all fields

**Step 6: Commit**

```bash
git add src/app/(app)/more/invoices/
git commit -m "feat: add invoice creation form with customer select and line items"
```

---

## Task 18: Invoice UI — Detail/Edit Page

**Files:**
- Create: `src/app/(app)/more/invoices/[id]/page.tsx`

**Step 1: Create invoice detail page**

- Fetch invoice with items by ID
- If status='draft': render editable invoice-form with existing data
- If status='completed': render read-only view with Print button
- Delete button (draft only)

**Step 2: Commit**

```bash
git add src/app/(app)/more/invoices/[id]/
git commit -m "feat: add invoice detail/edit page"
```

---

## Task 19: Invoice Completion & Inventory Deduction

**Files:**
- Modify: `src/app/(app)/more/invoices/actions.ts`

**Step 1: Implement completeInvoice action**

```typescript
export async function completeInvoice(id: string, locationCode: string) {
  // 1. Fetch invoice + items
  // 2. For each item:
  //    a. Find product by productId
  //    b. Find inventory at locationCode
  //    c. Calculate outbound (check sufficient stock)
  //    d. If insufficient → return error with item details
  // 3. If all items have sufficient stock:
  //    a. For each item, update inventory and create OUT transaction
  //    b. Update invoice status to 'completed'
  // 4. Revalidate paths
}
```

Uses the existing `calculateOutbound` from `@/lib/inventory`.

**Step 2: Add location selection to invoice completion**

When user clicks "Complete & Print", show a location selector first (which warehouse location to deduct from), then process.

**Step 3: Commit**

```bash
git add src/app/(app)/more/invoices/
git commit -m "feat: add invoice completion with inventory deduction"
```

---

## Task 20: Invoice Print Layout

**Files:**
- Create: `src/app/(app)/more/invoices/[id]/print/page.tsx`
- Create: `src/app/(app)/more/invoices/invoice-print.tsx`

**Step 1: Create print-optimized invoice component**

A full-page layout matching the CitiQuartz invoice template:

```tsx
export function InvoicePrint({ invoice, items }: Props) {
  return (
    <div className="print-invoice max-w-4xl mx-auto p-8 text-sm">
      {/* Company Header */}
      <div className="text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-bold">CitiQuartz Atlanta INC</h1>
        <p>6654 Jimmy Carter Blvd STE B, Peachtree Corners, GA 30071</p>
        <p>Tel: 770-560-5858 / 770-618-9889</p>
        <p>Email: citiquartzatlanta@gmail.com</p>
      </div>

      {/* Invoice Header: Date, Bill To, Ship To, Invoice#, PO# */}
      {/* Grid layout with Bill To left, Ship To right */}
      {/* Terms / Rep / Via / Ship row */}

      {/* Line Items Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2">
            <th>Quantity</th>
            <th>Item Code</th>
            <th>Description</th>
            <th>Price Each</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>{/* map items */}</tbody>
        <tfoot>
          <tr><td colSpan={4}>Total</td><td>${invoice.total}</td></tr>
        </tfoot>
      </table>

      {/* Payment Instructions */}
      {/* Terms & Conditions (6 items) */}
      {/* REMOVE PLASTIC instruction (bold/highlighted) */}
      {/* Received By: Signature / Print / Date lines */}
    </div>
  );
}
```

**Step 2: Create print page**

`print/page.tsx` — server component, fetches invoice + items, renders InvoicePrint. Add print CSS:

```css
@media print {
  @page { size: letter; margin: 0.5in; }
  body * { visibility: hidden; }
  .print-invoice, .print-invoice * { visibility: visible; }
  .print-invoice { position: absolute; left: 0; top: 0; width: 100%; }
}
```

**Step 3: Add "Print" button that calls `window.print()` or navigates to print page**

**Step 4: Commit**

```bash
git add src/app/(app)/more/invoices/
git commit -m "feat: add invoice print layout with company info and terms"
```

---

## Task 21: Final Build Verification & Cleanup

**Files:**
- All modified files

**Step 1: Run full build**

Run: `pnpm build`
Expected: Build succeeds with no errors

**Step 2: Run lint**

Run: `pnpm lint`
Expected: No lint errors (or only pre-existing ones)

**Step 3: Manual smoke test**

Start dev server: `pnpm dev`

Test checklist:
- [ ] Products: create/edit/delete with new fields (itemCode, description, priceEach)
- [ ] Operations: inbound/outbound/transfer/stocktake/return work with renamed fields
- [ ] Reports: inventory/transactions/charts show itemCode/description
- [ ] Export: Excel files have correct column headers
- [ ] Import: CSV template uses new fields
- [ ] Print Labels: QR codes use itemCode
- [ ] Customers: create/edit/delete/search
- [ ] Settings: invoice starting number configurable
- [ ] Invoices: create draft, add line items, select customers
- [ ] Invoices: complete invoice → inventory deducted
- [ ] Invoices: print layout shows company info + terms
- [ ] More menu: shows Customers and Invoices entries

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete product redesign and invoice feature"
```

---

## Summary: File Change Map

### Modified Files (~28)
| File | Changes |
|------|---------|
| `src/db/schema.ts` | Products table + 4 new tables + relations + types |
| `src/db/seed.ts` | Add default settings |
| `src/app/(app)/ops/actions.ts` | sku→itemCode, name→description in search |
| `src/app/(app)/ops/inbound/inbound-form.tsx` | product.sku→product.itemCode |
| `src/app/(app)/ops/outbound/outbound-form.tsx` | Same |
| `src/app/(app)/ops/transfer/transfer-form.tsx` | Same |
| `src/app/(app)/ops/stocktake/stocktake-form.tsx` | Same |
| `src/app/(app)/ops/return/return-form.tsx` | Same |
| `src/app/(app)/more/products/actions.ts` | Full field migration |
| `src/app/(app)/more/products/product-form.tsx` | New form fields |
| `src/app/(app)/more/products/product-list.tsx` | Display updates |
| `src/app/(app)/more/products/[id]/page.tsx` | Field references |
| `src/app/(app)/more/products/print/print-form.tsx` | Label content |
| `src/app/(app)/more/products/import/actions.ts` | Import fields |
| `src/app/(app)/more/products/import/import-form.tsx` | Template |
| `src/app/(app)/more/export/actions.ts` | Export fields |
| `src/app/(app)/more/export/export-form.tsx` | Excel headers |
| `src/app/(app)/reports/inventory/actions.ts` | Select fields |
| `src/app/(app)/reports/inventory/inventory-report.tsx` | Display |
| `src/app/(app)/reports/transactions/actions.ts` | Select fields |
| `src/app/(app)/reports/transactions/transaction-list.tsx` | Display |
| `src/app/(app)/reports/charts/actions.ts` | Select fields |
| `src/app/(app)/reports/charts/charts-view.tsx` | Display |
| `src/app/(app)/more/page.tsx` | Add menu items |
| `src/app/(app)/more/settings/page.tsx` | Invoice number config |
| `src/components/product/product-card.tsx` | Field display |
| `src/messages/en.json` | Updated + new sections |
| `src/messages/zh.json` | Updated + new sections |

### New Files (~15)
| File | Purpose |
|------|---------|
| `src/app/(app)/more/settings/actions.ts` | Settings CRUD |
| `src/app/(app)/more/customers/actions.ts` | Customer CRUD |
| `src/app/(app)/more/customers/page.tsx` | Customer list page |
| `src/app/(app)/more/customers/customer-list.tsx` | Customer list component |
| `src/app/(app)/more/customers/customer-form.tsx` | Customer form component |
| `src/app/(app)/more/customers/new/page.tsx` | New customer page |
| `src/app/(app)/more/customers/[id]/page.tsx` | Edit customer page |
| `src/app/(app)/more/invoices/actions.ts` | Invoice CRUD + completion |
| `src/app/(app)/more/invoices/page.tsx` | Invoice list page |
| `src/app/(app)/more/invoices/invoice-list.tsx` | Invoice list component |
| `src/app/(app)/more/invoices/new/page.tsx` | New invoice page |
| `src/app/(app)/more/invoices/invoice-form.tsx` | Invoice form |
| `src/app/(app)/more/invoices/customer-select.tsx` | Customer selector |
| `src/app/(app)/more/invoices/line-items.tsx` | Line items table |
| `src/app/(app)/more/invoices/[id]/page.tsx` | Invoice detail |
| `src/app/(app)/more/invoices/invoice-print.tsx` | Print layout |
| `src/components/form/combobox.tsx` | Reusable combobox |
