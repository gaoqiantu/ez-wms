<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js" alt="Next.js 15" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Turso-Edge_DB-4FF8D2?style=for-the-badge" alt="Turso" />
</p>

<h1 align="center">
  <br />
  📦 EZ-WMS
  <br />
  <sub>Easy Warehouse Management System</sub>
</h1>

<p align="center">
  A modern, mobile-first warehouse management system built for speed and simplicity.
  <br />
  Scan, manage, and track your inventory with ease.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#screenshots">Screenshots</a>
</p>

---

## Features

### Core Operations

| Operation | Color | Description |
|-----------|-------|-------------|
| 📥 **Inbound** | 🟢 Green | Receive new stock into warehouse |
| 📤 **Outbound** | 🟠 Orange | Ship products out of warehouse |
| 🔄 **Transfer** | 🔵 Blue | Move stock between locations |
| 📋 **Stocktake** | 🟡 Amber | Verify and adjust inventory counts |
| ↩️ **Return** | 🟣 Violet | Process customer returns |

### Key Capabilities

- **QR Code Scanning** — Instant product lookup via camera or manual entry
- **Real-time Inventory** — Track stock levels by location
- **Multi-language** — Full support for English and 中文
- **Dark Mode** — Easy on the eyes, day or night
- **Mobile-first** — Optimized for warehouse floor use
- **Reports & Charts** — Visual insights into your operations
- **Excel Import/Export** — Bulk product management
- **Barcode Generation** — Print product labels with QR codes

### Mobile UX

- 📱 **Touch-optimized** — 48px+ tap targets for gloved hands
- 🔒 **Safe areas** — iPhone notch & home indicator support
- ⚡ **Instant feedback** — Loading spinners & haptic-style animations
- 🎨 **Color-coded actions** — Visual operation distinction

---

## Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  Next.js 15      App Router, Server Components, RSC         │
│  React 19        Latest with Compiler optimizations         │
│  Tailwind CSS 4  Utility-first styling                      │
│  Radix UI        Accessible component primitives            │
│  Recharts        Data visualization                         │
│  Lucide          Beautiful icons                            │
├─────────────────────────────────────────────────────────────┤
│                        BACKEND                               │
├─────────────────────────────────────────────────────────────┤
│  Server Actions  Type-safe mutations                        │
│  Auth.js v5      Secure authentication                      │
│  Drizzle ORM     Type-safe database queries                 │
│  Turso           Edge SQLite database                       │
├─────────────────────────────────────────────────────────────┤
│                        TOOLING                               │
├─────────────────────────────────────────────────────────────┤
│  TypeScript 5    End-to-end type safety                     │
│  next-intl       Internationalization                       │
│  html5-qrcode    Camera-based scanning                      │
│  qrcode          Label generation                           │
└─────────────────────────────────────────────────────────────┘
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

Open [http://localhost:3000](http://localhost:3000) — you're ready to go!

### Default Credentials

After seeding:
- **Username:** `admin`
- **Password:** `admin123`

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
3. Add environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `AUTH_SECRET`
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gaoqiantu/ez-wms)

### Turso Database Setup

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso

# Login & create database
turso auth login
turso db create ez-wms

# Get credentials
turso db show ez-wms --url
turso db tokens create ez-wms
```

---

## Project Structure

```
ez-wms/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (app)/              # Authenticated routes
│   │   │   ├── dashboard/      # Home dashboard
│   │   │   ├── ops/            # Operations (inbound, outbound, etc.)
│   │   │   ├── reports/        # Analytics & reports
│   │   │   └── more/           # Settings, products, users
│   │   ├── api/                # API routes
│   │   └── login/              # Authentication
│   ├── components/
│   │   ├── ui/                 # Radix UI primitives
│   │   ├── layout/             # Header, BottomNav
│   │   ├── scanner/            # QR code scanner
│   │   └── form/               # Form components
│   ├── db/                     # Drizzle schema & config
│   ├── lib/                    # Utilities & auth
│   └── messages/               # i18n translations
├── drizzle/                    # Database migrations
└── public/                     # Static assets
```

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

## Screenshots

<table>
  <tr>
    <td align="center">
      <strong>Dashboard</strong><br />
      <sub>Quick stats & recent activity</sub>
    </td>
    <td align="center">
      <strong>Operations</strong><br />
      <sub>Color-coded action cards</sub>
    </td>
    <td align="center">
      <strong>Scanner</strong><br />
      <sub>QR/Barcode scanning</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <strong>Inventory</strong><br />
      <sub>Stock by location</sub>
    </td>
    <td align="center">
      <strong>Reports</strong><br />
      <sub>Charts & analytics</sub>
    </td>
    <td align="center">
      <strong>Dark Mode</strong><br />
      <sub>Easy on the eyes</sub>
    </td>
  </tr>
</table>

---

## Internationalization

EZ-WMS supports multiple languages out of the box:

- 🇺🇸 English
- 🇨🇳 中文 (Chinese)

Toggle language from the header icon. Add more languages by creating new files in `src/messages/`.

---

## License

MIT © [gaoqiantu](https://github.com/gaoqiantu)

---

<p align="center">
  <sub>Built with ❤️ for warehouse teams everywhere</sub>
</p>
