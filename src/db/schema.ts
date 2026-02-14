import { sqliteTable, text, integer, real, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { nanoid } from 'nanoid';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'operator'] }).notNull().default('operator'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

// Products table
export const products = sqliteTable('products', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  itemCode: text('item_code').notNull().unique(),
  description: text('description'),
  unit: text('unit').notNull().default('Pcs'),
  pcsPerBox: integer('pcs_per_box').notNull().default(1),
  priceEach: real('price_each').notNull().default(0),
  barcode: text('barcode').unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

// Locations table
export const locations = sqliteTable('locations', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
});

// Inventory table
export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  productId: text('product_id').notNull().references(() => products.id),
  boxQty: integer('box_qty').notNull().default(0),
  pcsQty: integer('pcs_qty').notNull().default(0),
  location: text('location').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}, (table) => [
  uniqueIndex('inventory_product_location_idx').on(table.productId, table.location),
]);

// Documents table
export const documents = sqliteTable('documents', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  docNo: text('doc_no').notNull().unique(),
  type: text('type', { enum: ['PO', 'ORDER', 'RMA'] }).notNull(),
  status: text('status', { enum: ['pending', 'completed'] }).notNull().default('pending'),
  partyName: text('party_name'),
  remark: text('remark'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

// Transactions table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  type: text('type', { enum: ['IN', 'OUT', 'MOVE', 'CHECK', 'RETURN'] }).notNull(),
  productId: text('product_id').notNull().references(() => products.id),
  boxQty: integer('box_qty').notNull().default(0),
  pcsQty: integer('pcs_qty').notNull().default(0),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  documentId: text('document_id').references(() => documents.id),
  operatorId: text('operator_id').notNull().references(() => users.id),
  remark: text('remark'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
}, (table) => [
  index('transactions_product_idx').on(table.productId),
  index('transactions_created_at_idx').on(table.createdAt),
  index('transactions_type_idx').on(table.type),
]);

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

// Invoices table
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  invoiceNo: integer('invoice_no').notNull().unique(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  status: text('status', { enum: ['draft', 'completed'] }).notNull().default('draft'),
  // Bill To
  billToCustomerId: text('bill_to_customer_id').references(() => customers.id),
  billToName: text('bill_to_name'),
  billToContact: text('bill_to_contact'),
  billToAddress: text('bill_to_address'),
  billToPhone: text('bill_to_phone'),
  billToEmail: text('bill_to_email'),
  // Ship To
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
  // Totals & metadata
  total: real('total').default(0),
  remark: text('remark'),
  operatorId: text('operator_id').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
});

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
  sortOrder: integer('sort_order').default(0),
});

// Settings table
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey().$defaultFn(() => nanoid()),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
  invoices: many(invoices),
}));

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  transactions: many(transactions),
  invoiceItems: many(invoiceItems),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

export const documentsRelations = relations(documents, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
  document: one(documents, {
    fields: [transactions.documentId],
    references: [documents.id],
  }),
  operator: one(users, {
    fields: [transactions.operatorId],
    references: [users.id],
  }),
}));

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

// ─── Export types ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;

export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;

export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
