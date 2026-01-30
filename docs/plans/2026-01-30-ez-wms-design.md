# ez-wms Design Document

> Lightweight Warehouse Management System for retail tile/countertop stores

## Overview

| Item | Detail |
|------|--------|
| Name | ez-wms (Easy Warehouse Management System) |
| Purpose | Lightweight WMS for retail tile/countertop stores |
| Language | Chinese + English (i18n) |
| Platform | Mobile-first PWA (browser-based) |
| Deployment | Vercel + Turso (near-zero cost) |
| Architecture | Single store/warehouse, simple role-based access |

## Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Framework | Next.js 15 (App Router) | Full-stack, RSC, API routes, PWA-ready |
| Database | Turso (libSQL) | Edge SQLite, generous free tier, low latency |
| ORM | Drizzle | Type-safe, lightweight, great Turso support |
| UI | Tailwind CSS + shadcn/ui | Mobile-first, accessible, fast to build |
| Auth | Auth.js v5 | Simple credentials provider, session management |
| Charts | Recharts | Lightweight, React-native, good mobile support |
| i18n | next-intl | App Router compatible, simple setup |
| QR Scanning | html5-qrcode | Browser-based, no native app needed |
| QR Generation | qrcode | Server-side QR code generation |
| Export | xlsx (SheetJS) | Client-side Excel generation |

## Architecture

```
┌─────────────────────────────────────────────┐
│           Mobile Browser (PWA)              │
│  ┌───────────────────────────────────────┐  │
│  │  Next.js App (React Server Components) │  │
│  │  - Pages: Dashboard, Operations, Admin │  │
│  │  - QR Scanner Component                │  │
│  │  - Responsive Mobile-First UI          │  │
│  └───────────────────────────────────────┘  │
│                    │                         │
│  ┌───────────────────────────────────────┐  │
│  │  Next.js API Routes + Server Actions   │  │
│  │  - /api/auth, /api/products, etc.     │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │    Turso Edge DB        │
        │   (SQLite + libSQL)     │
        └─────────────────────────┘
```

## Database Schema

### users
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Primary Key |
| username | TEXT UNIQUE | Login username |
| password_hash | TEXT | Hashed password |
| name | TEXT | Display name |
| role | TEXT | 'admin' \| 'operator' |
| created_at | DATETIME | Created time |
| updated_at | DATETIME | Updated time |

### products
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Primary Key |
| sku | TEXT UNIQUE | Product SKU (e.g., SKU-0001) / 货号 |
| name | TEXT | Product Name / 产品名称 |
| brand | TEXT | Brand / 品牌 |
| series | TEXT | Series / 系列 |
| spec | TEXT | Specification (e.g., 800x800) / 规格 |
| color | TEXT | Color/Pattern / 颜色/花色 |
| unit | TEXT | Unit (default: Pcs) / 单位 |
| pcs_per_box | INTEGER | Pieces per box / 片/箱 |
| area_per_pcs | REAL | Area per piece (m²) / 单片面积 |
| barcode | TEXT UNIQUE | QR code content (auto-generated) / 条码 |
| created_at | DATETIME | Created time |
| updated_at | DATETIME | Updated time |

### inventory
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Primary Key |
| product_id | TEXT FK | References products(id) |
| box_qty | INTEGER | Full box quantity / 整箱数 |
| pcs_qty | INTEGER | Loose piece quantity / 散片数 |
| location | TEXT | Bin/Location (e.g., A-01) / 库位 |
| updated_at | DATETIME | Updated time |
| | UNIQUE | (product_id, location) |

### documents
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Primary Key |
| doc_no | TEXT UNIQUE | Doc No: PO-xxx / ORD-xxx / RMA-xxx / 单号 |
| type | TEXT | 'PO' (采购单) \| 'ORDER' (销售单) \| 'RMA' (退货单) |
| status | TEXT | 'pending' (待处理) \| 'completed' (已完成) |
| party_name | TEXT | Supplier/Customer Name / 供应商/客户 |
| remark | TEXT | Remarks / 备注 |
| created_at | DATETIME | Created time |
| updated_at | DATETIME | Updated time |

### transactions
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Primary Key |
| type | TEXT | 'IN' (入库) \| 'OUT' (出库) \| 'MOVE' (移库) \| 'CHECK' (盘点) \| 'RETURN' (退货) |
| product_id | TEXT FK | References products(id) |
| box_qty | INTEGER | Change in box count (can be negative) |
| pcs_qty | INTEGER | Change in piece count |
| from_location | TEXT | Origin location (for transfers) / 原库位 |
| to_location | TEXT | Destination location / 目标库位 |
| document_id | TEXT FK | References documents(id) (optional) |
| operator_id | TEXT FK | References users(id) / 操作员 |
| remark | TEXT | Remarks / 备注 |
| created_at | DATETIME | Operation time |

### locations
| Field | Type | Description |
|-------|------|-------------|
| id | TEXT PK | Primary Key |
| code | TEXT UNIQUE | Location code (e.g., A-01) / 库位编码 |
| name | TEXT | Optional description / 库位名称 |
| sort_order | INTEGER | Display ordering |
| created_at | DATETIME | Created time |

## Calculated Fields (Display Only)

| Calculation | English | 中文 | Formula |
|-------------|---------|------|---------|
| Total Pcs | Total Pieces | 总片数 | `(box_qty × pcs_per_box) + pcs_qty` |
| Total Area | Total Area (m²) | 总面积 | `total_pcs × area_per_pcs` |

## Box/Piece Logic

Tiles are tracked in both full boxes and loose pieces:

- **box_qty**: Full sealed boxes count (整箱数)
- **pcs_qty**: Loose pieces not in a box (散片数)

**Auto-Unboxing Example (Outbound):**
```
pcs_per_box = 6
Current:     box_qty=2, pcs_qty=3   (15 total pieces)
Request:     8 pieces out
Calculation:
  - Need 8, have 3 loose → short 5
  - Unbox 1 box → +6 loose, -1 box
  - Take 8 from loose
Result:      box_qty=1, pcs_qty=1   (7 total pieces)
```

## Page Structure

### Navigation (Bottom Tab Bar)
```
🏠 Home (Dashboard) │ 📦 Ops (Operations) │ 📊 Reports │ ⚙️ More
```

### Page Map
```
/login                  → Login page

/dashboard              → Quick actions + stats + alerts

/ops                    → Operations hub
/ops/inbound            → 📥 Inbound flow
/ops/outbound           → 📤 Outbound flow
/ops/transfer           → 🔄 Transfer flow
/ops/stocktake          → 📋 Stocktake flow
/ops/return             → ↩️ Return flow

/reports                → Reports hub
/reports/inventory      → Current stock by product/location
/reports/transactions   → Transaction history with filters
/reports/charts         → Movement trends, daily activity

/more                   → Settings menu
/more/products          → Product master list (CRUD)
/more/products/print    → Batch QR label printing
/more/products/import   → CSV import
/more/documents         → Document list (PO/Order/RMA)
/more/locations         → Location management
/more/users             → User management (Admin only)
/more/settings          → App settings, language toggle
/more/export            → Export data to Excel
```

## Core Workflows

### 📥 Inbound (Receiving) / 入库
1. Scan QR / Search → Identify product
2. Input box quantity (Default: 1, use +/- buttons)
3. Input loose pieces (Optional)
4. Select location (Dropdown, recent first)
5. Select PO (Optional)
6. Add remark (Optional)
7. Confirm → Increase inventory, generate transaction log

### 📤 Outbound (Shipping) / 出库
1. Scan QR / Search → Display current stock
2. Input boxes or pieces (supports unboxing)
3. Select Order (Optional)
4. Add remark (Optional)
5. Confirm → Decrease inventory, auto-calculate unboxing

### 🔄 Transfer / 移库
1. Scan QR → Display current location
2. Select new location
3. Add remark (Optional)
4. Confirm → Update location, log transaction

### 📋 Stocktake (Inventory Count) / 盘点
1. Scan QR → Display system stock
2. Input physical box/piece count
3. Confirm → Auto-calculate discrepancy, adjust inventory, log variance

### ↩️ Returns / 退货
1. Scan QR → Identify product
2. Input return quantity (Boxes/Pieces)
3. Select reason (Dropdown: Customer Return / Quality Issue / Other)
4. Select RMA (Optional)
5. Confirm → Increase inventory, mark return source

## Operation Flow UI Pattern

```
┌─────────────────────────────────────┐
│ ← Inbound                      [EN] │  ← Header with back + lang toggle
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ 🔍 Scan QR or Search...     │    │  ← Scanner/Search input
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ SKU-0001                    │    │  ← Product card (after scan)
│  │ Brand Series 800x800 White  │    │
│  │ Stock: 5 boxes + 2 pcs      │    │
│  └─────────────────────────────┘    │
│                                     │
│  Boxes            [ - ]  1  [ + ]   │  ← Box qty with stepper
│  Pieces           [ - ]  0  [ + ]   │  ← Loose pcs (optional)
│                                     │
│  Location         [ A-01 ▼ ]        │  ← Dropdown (optional)
│  Document         [ Select ▼ ]      │  ← Optional dropdown
│  Remark           [___________]     │  ← Optional text
│                                     │
│  ┌─────────────────────────────┐    │
│  │        ✓ Confirm            │    │  ← Primary action button
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

## QR Code Generation & Printing

### QR Code Strategy
| Aspect | Design |
|--------|--------|
| Content | SKU encoded (e.g., `SKU-0001`) |
| Format | QR Code |
| Generation | Server-side using `qrcode` library |
| Storage | Generated on-demand |

### Label Format (~70×40mm standard)
```
┌─────────────────────────┐
│  ┌─────────┐            │
│  │ QR Code │  SKU-0001  │
│  │         │  800x800   │
│  └─────────┘  White     │
│  Brand Series    6pcs/箱│
└─────────────────────────┘
```

### Batch Printing Workflow
1. Select products from product list
2. Choose copies per product
3. Select label size (50×30mm / 70×40mm / 100×60mm)
4. Preview labels
5. Print via browser print dialog

## CSV Import

### Supported Imports
| Import Type | Purpose |
|-------------|---------|
| Products | Bulk add/update product master data |
| Inventory | Set initial stock levels |

### Products Template (`products_template.csv`)
```csv
sku,name,brand,series,spec,color,unit,pcs_per_box,area_per_pcs
SKU-0001,Italian Carrara Marble,MarbleCo,Premium,800x800,White,Pcs,6,0.64
SKU-0002,Grey Granite Tile,StoneTech,Standard,600x600,Dark Grey,Pcs,8,0.36
SKU-0003,Beige Ceramic,TileMax,Economy,300x600,Beige,Pcs,12,0.18
```

### Inventory Template (`inventory_template.csv`)
```csv
sku,location,box_qty,pcs_qty
SKU-0001,A-01,10,2
SKK-0001,A-02,5,0
SKU-0002,B-01,8,4
SKU-0003,B-02,20,6
```

### Import Modes
- **Add new only**: Skip existing SKUs
- **Update existing**: Match by SKU, update fields
- **Add + Update**: Upsert behavior

### Validation
- Missing required fields → Error, skip row
- Duplicate SKU in file → Warning, use first
- Invalid number format → Error, skip row
- Location not in system → Auto-create

## Dashboard

```
┌─────────────────────────────────────────┐
│ ez-wms                    [中/EN] [👤]  │
├─────────────────────────────────────────┤
│  Today's Activity                       │
│  ┌─────────┬─────────┬─────────┐       │
│  │ 📥 12   │ 📤 8    │ 🔄 3    │       │
│  │ Inbound │Outbound │Transfer │       │
│  └─────────┴─────────┴─────────┘       │
│                                         │
│  ⚠️ Low Stock Alerts (3)               │
│  ┌─────────────────────────────────┐   │
│  │ SKU-0012  White 800x800   1 box │   │
│  │ SKU-0034  Grey 600x600    0 box │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Quick Actions                          │
│  ┌──────┐ ┌──────┐ ┌──────┐           │
│  │  📥  │ │  📤  │ │  🔄  │           │
│  │Inbound│ │Outbnd│ │Transfer│          │
│  └──────┘ └──────┘ └──────┘           │
│  ┌──────┐ ┌──────┐                     │
│  │  📋  │ │  ↩️  │                     │
│  │Stock │ │Return│                     │
│  └──────┘ └──────┘                     │
│                                         │
│  Recent Transactions                    │
│  ┌─────────────────────────────────┐   │
│  │ 10:32 📥 SKU-001 +2box  A-01    │   │
│  │ 10:15 📤 SKU-034 -5pcs  B-02    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Reports

| Report | Description | Features |
|--------|-------------|----------|
| Inventory | Current stock by product/location | Filter, search, sort |
| Transactions | Movement history | Date range, type filter |
| Charts | Visual analytics | Daily trends, top products, stock distribution |

### Chart Types
- 📈 Daily Movement (7/30 days) - Bar chart: IN vs OUT
- 📊 Top 10 Products - Horizontal bar: Most moved
- 🥧 Stock by Location - Pie chart: Distribution
- 📉 Stock Trend - Line chart: Total over time

## Export

| Export | Format | Contents |
|--------|--------|----------|
| Inventory | Excel (.xlsx) | All products with current stock |
| Transactions | Excel (.xlsx) | Filtered transaction history |
| Products | Excel (.xlsx) | Product master data |

## User Roles

| Role | Permissions |
|------|-------------|
| Admin | All operations + User management + Settings |
| Operator | All warehouse operations (no settings/users) |

## i18n

- Toggle between 中文 / English in header
- All labels, messages, and UI text translated
- CSV templates support Chinese characters (UTF-8 BOM)

## Out of Scope (Future)

- Multi-warehouse / multi-store
- Complex role permissions
- Offline mode / PWA sync
- Barcode printer hardware integration
- Purchase order / sales order full lifecycle
- Inventory valuation / costing
- Supplier / customer management
- Lot / batch tracking
