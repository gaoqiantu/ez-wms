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
  sku: text('sku').notNull().unique(),
  name: text('name').notNull(),
  brand: text('brand'),
  series: text('series'),
  spec: text('spec'),
  color: text('color'),
  unit: text('unit').notNull().default('Pcs'),
  pcsPerBox: integer('pcs_per_box').notNull().default(1),
  areaPerPcs: real('area_per_pcs'),
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

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  transactions: many(transactions),
}));

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  transactions: many(transactions),
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

// Export types
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
