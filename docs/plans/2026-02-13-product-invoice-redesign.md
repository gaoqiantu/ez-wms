# Product Field Redesign & Invoice Feature

**Date:** 2026-02-13
**Status:** Approved

---

## 1. Product Schema Changes

### Fields to Remove
- `name` (Product Name)
- `brand`
- `series`
- `spec`
- `color`
- `areaPerPcs`

### Fields to Rename
- `sku` → `itemCode` (DB column: `item_code`)

### Fields to Add
- `description` (text, optional) — free-text product description
- `priceEach` (real, required) — unit price for invoicing

### Fields to Keep (unchanged)
- `id`, `unit`, `pcsPerBox`, `barcode`, `createdAt`, `updatedAt`

### Final Product Schema
```
products:
  id          text PK (nanoid)
  itemCode    text UNIQUE NOT NULL        — was "sku"
  description text                        — NEW
  priceEach   real NOT NULL DEFAULT 0     — NEW
  unit        text NOT NULL DEFAULT 'Pcs'
  pcsPerBox   integer NOT NULL DEFAULT 1
  barcode     text UNIQUE                 — synced with itemCode
  createdAt   timestamp
  updatedAt   timestamp
```

### Migration Impact
- ~28 files reference `sku` or `name` and need updating
- Database migration: rename column, drop columns, add columns
- UI: all product forms, cards, lists, reports, import/export updated
- QR scanner search: search by `itemCode` instead of `sku`
- Translations (en.json, zh.json): update all product-related keys

---

## 2. Customer Management

### New `customers` Table
```
customers:
  id          text PK (nanoid)
  name        text NOT NULL               — Business name
  contactName text                        — Contact person
  address     text                        — Full address
  phone       text
  email       text
  createdAt   timestamp
  updatedAt   timestamp
```

### Behavior
- CRUD operations accessible from More menu
- Searchable list with name/contact/address
- Can be created inline during invoice creation (type new info → auto-saves as customer)
- Used for both Bill To and Ship To (independently selectable)

### UI
- `/more/customers` — customer list page
- `/more/customers/[id]` — edit customer
- `/more/customers/new` — add customer
- Search/filter by name or contact name

---

## 3. Invoice System

### New `invoices` Table
```
invoices:
  id                text PK (nanoid)
  invoiceNo         integer UNIQUE NOT NULL  — auto-incrementing plain number
  date              timestamp NOT NULL
  status            'draft' | 'completed'    — DEFAULT 'draft'

  -- Bill To (snapshot from customer)
  billToCustomerId  text FK → customers (optional, reference only)
  billToName        text
  billToContact     text
  billToAddress     text
  billToPhone       text
  billToEmail       text

  -- Ship To (snapshot from customer)
  shipToCustomerId  text FK → customers (optional, reference only)
  shipToName        text
  shipToContact     text
  shipToAddress     text
  shipToPhone       text
  shipToEmail       text

  -- Header fields
  poNumber          text                     — Customer's P.O. Number
  terms             text                     — COD, Net 14, Net 30, etc.
  rep               text                     — Sales rep
  via               text                     — Shipping method
  ship              text                     — Shipping details

  -- Totals
  total             real DEFAULT 0           — Sum of line item amounts

  remark            text
  operatorId        text FK → users NOT NULL
  createdAt         timestamp
  updatedAt         timestamp
```

### New `invoice_items` Table
```
invoice_items:
  id          text PK (nanoid)
  invoiceId   text FK → invoices NOT NULL
  productId   text FK → products (optional, reference only)
  quantity    integer NOT NULL DEFAULT 0
  itemCode    text NOT NULL               — Snapshot at invoice creation
  description text                        — Snapshot
  priceEach   real NOT NULL DEFAULT 0     — Snapshot
  amount      real NOT NULL DEFAULT 0     — quantity × priceEach
  sortOrder   integer DEFAULT 0
```

### New `settings` Table
```
settings:
  id    text PK (nanoid)
  key   text UNIQUE NOT NULL
  value text NOT NULL                     — JSON or plain text
```

**Settings keys used:**
- `invoice_next_number` — next invoice number to use (e.g., "1001")
- `terms_options` — JSON array of saved terms values
- `rep_options` — JSON array of saved rep values
- `via_options` — JSON array of saved via values
- `ship_options` — JSON array of saved ship values

### Invoice Number Behavior
- Configurable starting number via Settings page
- Auto-increments: each new invoice gets `invoice_next_number`, then increments it
- Plain number format: 1001, 1002, 1003...

### Inventory Deduction
- When invoice status changes to `completed`:
  - For each line item, create an outbound (`OUT`) transaction
  - Deduct from inventory at the relevant location
  - Validate sufficient stock before completing
- Draft invoices do NOT affect inventory

### Combobox Fields (Terms, Rep, Via, Ship)
- Show previously saved values as dropdown options
- Allow free-text input
- New values auto-save to settings for future use
- Searchable/filterable

---

## 4. Invoice UI

### Navigation
- "Invoices" in the More menu
- "Customers" in the More menu

### Invoice List Page (`/more/invoices`)
- List of all invoices with: Invoice #, Date, Bill To name, Total, Status
- Search/filter by invoice number or customer name
- Button to create new invoice

### Invoice Creation Page (`/more/invoices/new`)
```
┌─────────────────────────────────────────┐
│ New Invoice                    [Save]   │
├─────────────────────────────────────────┤
│ Date: [date picker]  Invoice #: 1001   │
│ P.O. Number: [________]                │
├──────────────────┬──────────────────────┤
│ Bill To:         │ Ship To:            │
│ [Search/New ▼]   │ [Search/New ▼]      │
│ Business Name    │ Business Name       │
│ Contact Name     │ Contact Name        │
│ Address          │ Address             │
│ Phone / Email    │ Phone / Email       │
├──────────────────┴──────────────────────┤
│ Terms: [combobox]  Rep: [combobox]     │
│ Via:   [combobox]  Ship: [combobox]    │
├─────────────────────────────────────────┤
│ Line Items:                [+ Add Item] │
│ Qty | Item Code | Description | Price  │
│ [+] [scan/search] [auto-fill] [auto]  │
├─────────────────────────────────────────┤
│                       Total: $XXX.XX   │
│ Remark: [________________________]     │
├─────────────────────────────────────────┤
│ [Save Draft]  [Complete & Print]       │
└─────────────────────────────────────────┘
```

### Adding Line Items
- Tap "+ Add Item" → opens product scanner/search (reuse existing QR scanner)
- Select product → auto-fills Item Code, Description, Price Each
- Enter quantity → Amount auto-calculates
- Can add multiple line items
- Swipe/tap to remove a line item

### Invoice Detail Page (`/more/invoices/[id]`)
- View/edit invoice (if draft)
- Read-only if completed
- Print button

---

## 5. Print Layout

Full-page print layout matching the provided invoice template:

```
┌─────────────────────────────────────────────┐
│           CitiQuartz Atlanta INC            │
│    6654 Jimmy Carter Blvd STE B             │
│    Peachtree Corners, GA 30071              │
│    Tel: 770-560-5858 / 770-618-9889         │
│    Email: citiquartzatlanta@gmail.com        │
├─────────────────────────────────────────────┤
│ Date: ___    Bill To: ___    P.O.#: ___     │
│              Ship To: ___    Invoice#: ___   │
│              Terms / Rep / Via / Ship        │
├─────────────────────────────────────────────┤
│ Qty │ Item Code │ Description │ Price │ Amt │
│  5  │ QZ-001    │ White Qrtz  │ 25.00 │ 125 │
│  3  │ QZ-002    │ Grey Marble │ 30.00 │  90 │
├─────────────────────────────────────────────┤
│                              Total: $215.00 │
├─────────────────────────────────────────────┤
│ Payment Instructions:                       │
│ Checks Payable To: CitiQuartz Atlanta INC   │
│ Zelle Payment: 770-560-5858                 │
├─────────────────────────────────────────────┤
│ Terms & Conditions:                         │
│ 1. All invoices are to be paid C.O.D.       │
│ 2. Customer must check products on-site...  │
│ 3. Customer must check before fabricating... │
│ 4. Returns within 15 days, store credit...  │
│ 5. All sale/discount orders are final...    │
│ 6. Actual slab color may vary...            │
│                                             │
│ ⚠ REMOVE THE PLASTIC AND INSPECT THIS      │
│   MATERIAL BEFORE YOU CUT.                  │
├─────────────────────────────────────────────┤
│ Received By:                                │
│ Signature: _________ Date: _________       │
│ Print:     _________                        │
└─────────────────────────────────────────────┘
```

### Company Info (Hardcoded)
```
Business Name: CitiQuartz Atlanta INC
Address: 6654 Jimmy Carter Blvd STE B, Peachtree Corners, GA 30071
Telephone: 770-560-5858 / 770-618-9889
Email: citiquartzatlanta@gmail.com
```

### Payment Instructions (Hardcoded)
```
Checks Payable To: CitiQuartz Atlanta INC
Zelle Payment: 770-560-5858
```

### Terms & Conditions (Hardcoded)
1. All invoices are to be paid C.O.D. (Cash on Delivery).
2. The customer must check ordered products while the driver is on-site. The company is not responsible for defects/damage once unloaded.
3. The customer must check products before fabricating/cutting. The company is not responsible for defects/damage once fabricated.
4. Returns are accepted within 15 days of delivery for Store Credit only (no refunds).
5. All sale and discount orders are final (no returns/refunds).
6. Actual slab color may vary from samples; the company reserves the right of final explanation.

**Instruction:** REMOVE THE PLASTIC AND INSPECT THIS MATERIAL BEFORE YOU CUT.

---

## 6. Existing System Updates

### Documents Table
- Keep existing `documents` table for PO/ORDER/RMA
- Invoices are a separate system (new `invoices` table)
- No changes to existing document flow

### Operations
- All 5 operations (Inbound, Outbound, Transfer, Stocktake, Return) remain
- Outbound transactions are also auto-created when invoices are completed
- Product references in operations use `itemCode` instead of `sku`

### Reports
- Inventory report: show `itemCode` + `description` instead of `sku` + `name`
- Transaction report: same field updates
- Charts: same field updates

### Import/Export
- Excel import: column headers change to `Item Code`, `Description`, `Price Each`
- Excel export: same column header changes

### More Menu (updated)
```
Products | Customers | Invoices | Print Labels
Import   | Locations | Documents | Export
Users (admin) | Settings
```

---

## 7. Implementation Order

1. **Database schema changes** — products, new tables (customers, invoices, invoice_items, settings)
2. **Product field migration** — rename sku→itemCode across ~28 files
3. **Customer CRUD** — new pages + server actions
4. **Settings system** — invoice number config + combobox saved values
5. **Invoice CRUD** — create, edit, list, detail pages
6. **Invoice line items** — product search, quantity, amount calculation
7. **Invoice completion** — inventory deduction via outbound transactions
8. **Print layout** — CSS print styles with company info + terms
9. **Navigation updates** — More menu additions
10. **i18n** — English + Chinese translations for all new features
