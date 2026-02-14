<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Turso-Edge_DB-4FF8D2?style=for-the-badge" alt="Turso" />
</p>

<h1 align="center">
  <br />
  EZ-WMS
  <br />
  <sub>Easy Warehouse Management System</sub>
</h1>

<p align="center">
  A modern, mobile-first warehouse management system built for speed and simplicity.
  <br />
  Scan, manage, and track your inventory with ease.
</p>

<p align="center">
  <a href="#features">Features</a> &bull;
  <a href="#tech-stack">Tech Stack</a> &bull;
  <a href="#getting-started">Getting Started</a> &bull;
  <a href="#deployment">Deployment</a> &bull;
  <a href="#project-structure">Project Structure</a>
</p>

---

## Features

### Core Operations

| Operation | Description |
|-----------|-------------|
| **Inbound** | Receive new stock into warehouse |
| **Outbound** | Ship products out of warehouse |
| **Transfer** | Move stock between locations |
| **Stocktake** | Verify and adjust inventory counts |
| **Return** | Process customer returns with reason tracking |

### Invoice System

- **Create & edit invoices** with auto-incrementing invoice numbers
- **Bill To / Ship To** with inline customer search and auto-creation
- **Line items** with QR scanner product lookup, quantity, and pricing
- **Combobox fields** for Terms, Rep, Via, Ship (saved values auto-complete)
- **Draft workflow** &mdash; save as draft, then complete with inventory deduction
- **Printable invoices** &mdash; US Letter format with company header, terms & conditions, and signature area
- **Atomic operations** &mdash; inventory deduction and invoice completion in a single database transaction

### Customer Management

- Full CRUD with search and pagination
- Auto-created from invoice Bill To / Ship To fields
- Contact name, address, phone, and email tracking

### Configurable Settings

- **Company information** &mdash; name, address, phone, email, and payment instructions displayed on printed invoices
- **Invoice starting number** &mdash; configurable next invoice number
- **Language** &mdash; switch between English and Chinese

### Key Capabilities

- **QR Code Scanning** &mdash; instant product lookup via camera or manual search
- **Real-time Inventory** &mdash; track stock levels by location (boxes + loose pieces)
- **Multi-language** &mdash; full support for English and Chinese
- **Dark Mode** &mdash; system-aware theme switching
- **Mobile-first** &mdash; optimized for warehouse floor use with touch-friendly targets
- **Reports & Charts** &mdash; daily movement, top products, stock by location
- **Excel Import/Export** &mdash; bulk product and inventory management
- **Label Generation** &mdash; print QR code labels for products
- **User Management** &mdash; admin and operator roles
- **Location Management** &mdash; configure warehouse storage locations

---

## Tech Stack

```
Frontend          Next.js 15 (App Router, RSC), React 19, Tailwind CSS 4
UI Components     Radix UI primitives (shadcn/ui), Lucide icons, Recharts
Backend           Server Actions, Auth.js v5, Drizzle ORM
Database          Turso (edge SQLite) / local libSQL for development
Tooling           TypeScript 5, next-intl (i18n), html5-qrcode, nanoid
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### 1. Clone & Install

```bash
git clone https://github.com/gaoqiantu/ez-wms.git
cd ez-wms
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Configure your `.env.local`:

```env
# Database (Turso)
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token

# Auth
AUTH_SECRET=your-secret-key  # Run: openssl rand -base64 32
AUTH_TRUST_HOST=true
```

### 3. Database Setup

```bash
# Push schema to database
pnpm db:push

# Seed with demo data (optional)
pnpm db:seed
```

### 4. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

**Default credentials** (after seeding): `admin` / `admin123`

---

## Local Development with SQLite

For local development without Turso:

```bash
# Install sqld (libSQL server)
brew install libsql/sqld/sqld

# Start local database server
sqld --db-path local.db

# Update .env.local
TURSO_DATABASE_URL=http://127.0.0.1:8080
TURSO_AUTH_TOKEN=local-dev-token
```

---

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`
4. Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gaoqiantu/ez-wms)

### Turso Database Setup

```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create ez-wms
turso db show ez-wms --url
turso db tokens create ez-wms
```

---

## Project Structure

```
ez-wms/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (app)/                  # Authenticated routes
│   │   │   ├── dashboard/          # Home dashboard
│   │   │   ├── ops/                # Operations (inbound, outbound, etc.)
│   │   │   ├── reports/            # Analytics, charts, transaction history
│   │   │   └── more/               # Settings & management pages
│   │   │       ├── products/       # Product catalog CRUD + import/export
│   │   │       ├── customers/      # Customer management
│   │   │       ├── invoices/       # Invoice system (create, edit, print)
│   │   │       ├── locations/      # Warehouse locations
│   │   │       ├── documents/      # PO, Sales Orders, RMA
│   │   │       ├── users/          # User management
│   │   │       └── settings/       # App configuration
│   │   ├── api/                    # API routes (auth)
│   │   └── login/                  # Authentication page
│   ├── components/
│   │   ├── ui/                     # Radix UI primitives (shadcn/ui)
│   │   ├── layout/                 # Header, BottomNav
│   │   ├── scanner/                # QR code scanner
│   │   └── form/                   # Combobox, form components
│   ├── db/                         # Drizzle schema & config
│   ├── lib/                        # Utilities, auth, inventory calculations
│   └── messages/                   # i18n translations (en, zh)
├── drizzle/                        # Database migrations
└── public/                         # Static assets
```

---

## Database Schema

The system uses 7 core tables:

| Table | Purpose |
|-------|---------|
| `users` | Authentication and user roles |
| `products` | Product catalog (itemCode, description, priceEach, pcsPerBox) |
| `inventory` | Stock levels by product and location (boxes + pieces) |
| `transactions` | Audit log of all inventory movements |
| `customers` | Customer directory for invoices |
| `invoices` | Invoice headers with Bill To / Ship To snapshots |
| `invoice_items` | Line items linked to invoices and products |
| `settings` | Key-value configuration (invoice numbers, company info, combobox options) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:push` | Push schema to database |
| `pnpm db:generate` | Generate migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:seed` | Seed demo data |

---

## Internationalization

EZ-WMS supports multiple languages:

- English
- Chinese

Toggle from Settings. Add more languages by creating new files in `src/messages/`.

---

## License

MIT

---

<p align="center">
  <sub>Built for warehouse teams everywhere</sub>
</p>
