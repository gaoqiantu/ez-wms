# ez-wms Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a lightweight, mobile-first WMS for tile/countertop retail stores with QR scanning, box/piece inventory tracking, and bilingual support.

**Architecture:** Next.js 15 App Router with Server Components and Server Actions. Turso (libSQL) for edge SQLite database. Drizzle ORM for type-safe queries. Mobile-first PWA with bottom tab navigation.

**Tech Stack:** Next.js 15, Turso, Drizzle, Tailwind CSS, shadcn/ui, Auth.js v5, next-intl, html5-qrcode, qrcode, Recharts, xlsx

---

## Phase 1: Project Setup & Infrastructure

### Task 1.1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `next.config.ts`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

**Step 1: Create Next.js 15 project**

Run in `.worktrees/dev`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm
```

Select: No to Turbopack (for stability)

**Step 2: Verify project runs**

```bash
pnpm dev
```

Expected: Server starts at http://localhost:3000

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: initialize Next.js 15 project with TypeScript and Tailwind"
```

---

### Task 1.2: Install Core Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install database dependencies**

```bash
pnpm add @libsql/client drizzle-orm
pnpm add -D drizzle-kit
```

**Step 2: Install UI dependencies**

```bash
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm dlx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes

**Step 3: Install auth & i18n**

```bash
pnpm add next-auth@beta next-intl
```

**Step 4: Install utility libraries**

```bash
pnpm add html5-qrcode qrcode recharts xlsx nanoid bcryptjs
pnpm add -D @types/qrcode @types/bcryptjs
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: install core dependencies (drizzle, shadcn, auth, i18n, qr, charts)"
```

---

### Task 1.3: Configure Turso Database

**Files:**
- Create: `src/db/index.ts`
- Create: `src/db/schema.ts`
- Create: `drizzle.config.ts`
- Create: `.env.local` (not committed)
- Modify: `.gitignore`

**Step 1: Create Turso database**

```bash
turso db create ez-wms
turso db show ez-wms --url
turso db tokens create ez-wms
```

Save URL and token.

**Step 2: Create environment file**

Create `.env.local`:
```env
TURSO_DATABASE_URL=libsql://ez-wms-<your-org>.turso.io
TURSO_AUTH_TOKEN=<your-token>
AUTH_SECRET=<generate-with-openssl-rand-base64-32>
```

**Step 3: Create database client**

Create `src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

**Step 4: Create database schema**

Create `src/db/schema.ts`:
```typescript
import { sqliteTable, text, integer, real, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'operator'] }).notNull().default('operator'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  sku: text('sku').unique().notNull(),
  name: text('name').notNull(),
  brand: text('brand'),
  series: text('series'),
  spec: text('spec'),
  color: text('color'),
  unit: text('unit').default('Pcs'),
  pcsPerBox: integer('pcs_per_box').default(1),
  areaPerPcs: real('area_per_pcs'),
  barcode: text('barcode').unique(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const locations = sqliteTable('locations', {
  id: text('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name'),
  sortOrder: integer('sort_order').default(0),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const inventory = sqliteTable('inventory', {
  id: text('id').primaryKey(),
  productId: text('product_id').notNull().references(() => products.id),
  boxQty: integer('box_qty').default(0),
  pcsQty: integer('pcs_qty').default(0),
  location: text('location').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  productLocationIdx: uniqueIndex('product_location_idx').on(table.productId, table.location),
}));

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  docNo: text('doc_no').unique().notNull(),
  type: text('type', { enum: ['PO', 'ORDER', 'RMA'] }).notNull(),
  status: text('status', { enum: ['pending', 'completed'] }).default('pending'),
  partyName: text('party_name'),
  remark: text('remark'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  type: text('type', { enum: ['IN', 'OUT', 'MOVE', 'CHECK', 'RETURN'] }).notNull(),
  productId: text('product_id').notNull().references(() => products.id),
  boxQty: integer('box_qty').default(0),
  pcsQty: integer('pcs_qty').default(0),
  fromLocation: text('from_location'),
  toLocation: text('to_location'),
  documentId: text('document_id').references(() => documents.id),
  operatorId: text('operator_id').notNull().references(() => users.id),
  remark: text('remark'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`),
});

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Location = typeof locations.$inferSelect;
export type Inventory = typeof inventory.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
```

**Step 5: Create Drizzle config**

Create `drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

**Step 6: Add db scripts to package.json**

Add to `package.json` scripts:
```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

**Step 7: Push schema to database**

```bash
pnpm db:push
```

**Step 8: Commit**

```bash
git add -A
git commit -m "feat: configure Turso database with Drizzle schema"
```

---

### Task 1.4: Setup Auth.js

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/middleware.ts`

**Step 1: Create auth configuration**

Create `src/lib/auth.ts`:
```typescript
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await db.query.users.findFirst({
          where: eq(users.username, credentials.username as string),
        });

        if (!user) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

**Step 2: Create auth route handler**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;
```

**Step 3: Create middleware**

Create `src/middleware.ts`:
```typescript
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnLoginPage = req.nextUrl.pathname === '/login';
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth');

  if (isAuthRoute) {
    return NextResponse.next();
  }

  if (!isLoggedIn && !isOnLoginPage) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && isOnLoginPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

**Step 4: Create auth types**

Create `src/types/next-auth.d.ts`:
```typescript
import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: setup Auth.js with credentials provider and middleware"
```

---

### Task 1.5: Setup next-intl for i18n

**Files:**
- Create: `src/i18n/config.ts`
- Create: `src/i18n/request.ts`
- Create: `src/messages/en.json`
- Create: `src/messages/zh.json`
- Modify: `next.config.ts`
- Modify: `src/middleware.ts`

**Step 1: Create i18n config**

Create `src/i18n/config.ts`:
```typescript
export const locales = ['en', 'zh'] as const;
export const defaultLocale = 'en' as const;
export type Locale = (typeof locales)[number];
```

**Step 2: Create request config**

Create `src/i18n/request.ts`:
```typescript
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { defaultLocale, locales, type Locale } from './config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get('locale')?.value;
  const locale = locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale;

  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});
```

**Step 3: Create English messages**

Create `src/messages/en.json`:
```json
{
  "common": {
    "appName": "ez-wms",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "search": "Search",
    "loading": "Loading...",
    "noData": "No data",
    "success": "Success",
    "error": "Error"
  },
  "auth": {
    "login": "Login",
    "logout": "Logout",
    "username": "Username",
    "password": "Password",
    "loginButton": "Sign In",
    "loginError": "Invalid username or password"
  },
  "nav": {
    "dashboard": "Dashboard",
    "operations": "Operations",
    "reports": "Reports",
    "more": "More"
  },
  "ops": {
    "inbound": "Inbound",
    "outbound": "Outbound",
    "transfer": "Transfer",
    "stocktake": "Stocktake",
    "return": "Return",
    "scanOrSearch": "Scan QR or search...",
    "boxes": "Boxes",
    "pieces": "Pieces",
    "location": "Location",
    "document": "Document",
    "remark": "Remark",
    "currentStock": "Current Stock"
  },
  "products": {
    "title": "Products",
    "sku": "SKU",
    "name": "Product Name",
    "brand": "Brand",
    "series": "Series",
    "spec": "Specification",
    "color": "Color/Pattern",
    "unit": "Unit",
    "pcsPerBox": "Pcs/Box",
    "areaPerPcs": "Area/Pc (m²)"
  },
  "inventory": {
    "title": "Inventory",
    "boxQty": "Boxes",
    "pcsQty": "Loose Pcs",
    "totalPcs": "Total Pieces",
    "totalArea": "Total Area"
  },
  "dashboard": {
    "todayActivity": "Today's Activity",
    "lowStockAlerts": "Low Stock Alerts",
    "quickActions": "Quick Actions",
    "recentTransactions": "Recent Transactions"
  }
}
```

**Step 4: Create Chinese messages**

Create `src/messages/zh.json`:
```json
{
  "common": {
    "appName": "ez-wms",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "delete": "删除",
    "edit": "编辑",
    "search": "搜索",
    "loading": "加载中...",
    "noData": "暂无数据",
    "success": "成功",
    "error": "错误"
  },
  "auth": {
    "login": "登录",
    "logout": "退出",
    "username": "用户名",
    "password": "密码",
    "loginButton": "登录",
    "loginError": "用户名或密码错误"
  },
  "nav": {
    "dashboard": "仪表盘",
    "operations": "操作",
    "reports": "报表",
    "more": "更多"
  },
  "ops": {
    "inbound": "入库",
    "outbound": "出库",
    "transfer": "移库",
    "stocktake": "盘点",
    "return": "退货",
    "scanOrSearch": "扫描或搜索...",
    "boxes": "整箱",
    "pieces": "散片",
    "location": "库位",
    "document": "单据",
    "remark": "备注",
    "currentStock": "当前库存"
  },
  "products": {
    "title": "产品",
    "sku": "货号",
    "name": "产品名称",
    "brand": "品牌",
    "series": "系列",
    "spec": "规格",
    "color": "颜色/花色",
    "unit": "单位",
    "pcsPerBox": "片/箱",
    "areaPerPcs": "单片面积 (m²)"
  },
  "inventory": {
    "title": "库存",
    "boxQty": "整箱数",
    "pcsQty": "散片数",
    "totalPcs": "总片数",
    "totalArea": "总面积"
  },
  "dashboard": {
    "todayActivity": "今日动态",
    "lowStockAlerts": "低库存预警",
    "quickActions": "快捷操作",
    "recentTransactions": "最近操作"
  }
}
```

**Step 5: Update next.config.ts**

```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // config options here
};

export default withNextIntl(nextConfig);
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: setup next-intl with English and Chinese translations"
```

---

### Task 1.6: Setup shadcn/ui Base Components

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/lib/utils.ts`

**Step 1: Add shadcn components**

```bash
pnpm dlx shadcn@latest add button input card select label badge dialog dropdown-menu separator toast tabs
```

**Step 2: Create utility function**

Create `src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add shadcn/ui base components"
```

---

### Task 1.7: Create Mobile-First Layout Shell

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`
- Create: `src/components/layout/header.tsx`
- Create: `src/components/layout/app-shell.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(app)/layout.tsx`

**Step 1: Create bottom navigation**

Create `src/components/layout/bottom-nav.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, BarChart3, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: Home, labelKey: 'dashboard' },
  { href: '/ops', icon: Package, labelKey: 'operations' },
  { href: '/reports', icon: BarChart3, labelKey: 'reports' },
  { href: '/more', icon: MoreHorizontal, labelKey: 'more' },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

**Step 2: Create header**

Create `src/components/layout/header.tsx`:
```typescript
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { LanguageToggle } from './language-toggle';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
}

export function Header({ title, showBack }: HeaderProps) {
  const t = useTranslations('common');
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background px-4">
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold">
          {title || t('appName')}
        </h1>
      </div>
      <LanguageToggle />
    </header>
  );
}
```

**Step 3: Create language toggle**

Create `src/components/layout/language-toggle.tsx`:
```typescript
'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function LanguageToggle() {
  const router = useRouter();

  const toggleLocale = async () => {
    const currentLocale = document.cookie
      .split('; ')
      .find((row) => row.startsWith('locale='))
      ?.split('=')[1] || 'en';

    const newLocale = currentLocale === 'en' ? 'zh' : 'en';
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale}>
      中/EN
    </Button>
  );
}
```

**Step 4: Create app shell**

Create `src/components/layout/app-shell.tsx`:
```typescript
import { BottomNav } from './bottom-nav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 pb-16">{children}</main>
      <BottomNav />
    </div>
  );
}
```

**Step 5: Create app layout**

Create `src/app/(app)/layout.tsx`:
```typescript
import { AppShell } from '@/components/layout/app-shell';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
```

**Step 6: Update root layout**

Update `src/app/layout.tsx`:
```typescript
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ez-wms',
  description: 'Lightweight Warehouse Management System',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: create mobile-first layout with bottom nav and header"
```

---

## Phase 2: Authentication & User Management

### Task 2.1: Create Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/login-form.tsx`
- Create: `src/app/login/actions.ts`

**Step 1: Create login action**

Create `src/app/login/actions.ts`:
```typescript
'use server';

import { signIn } from '@/lib/auth';
import { AuthError } from 'next-auth';

export async function login(formData: FormData) {
  try {
    await signIn('credentials', {
      username: formData.get('username') as string,
      password: formData.get('password') as string,
      redirectTo: '/dashboard',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid username or password' };
    }
    throw error;
  }
}
```

**Step 2: Create login form**

Create `src/app/login/login-form.tsx`:
```typescript
'use client';

import { useFormStatus } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from './actions';
import { useState } from 'react';

function SubmitButton() {
  const { pending } = useFormStatus();
  const t = useTranslations('auth');

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? '...' : t('loginButton')}
    </Button>
  );
}

export function LoginForm() {
  const t = useTranslations('auth');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-center text-2xl">ez-wms</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {t('loginError')}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username">{t('username')}</Label>
            <Input
              id="username"
              name="username"
              type="text"
              required
              autoComplete="username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t('password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 3: Create login page**

Create `src/app/login/page.tsx`:
```typescript
import { LoginForm } from './login-form';
import { LanguageToggle } from '@/components/layout/language-toggle';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <LanguageToggle />
      </div>
      <LoginForm />
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: create login page with credentials form"
```

---

### Task 2.2: Create Seed Script for Admin User

**Files:**
- Create: `src/db/seed.ts`
- Modify: `package.json`

**Step 1: Create seed script**

Create `src/db/seed.ts`:
```typescript
import { db } from './index';
import { users, locations } from './schema';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';

async function seed() {
  console.log('Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  await db.insert(users).values({
    id: nanoid(),
    username: 'admin',
    passwordHash: adminPassword,
    name: 'Administrator',
    role: 'admin',
  }).onConflictDoNothing();

  // Create sample locations
  const sampleLocations = [
    { id: nanoid(), code: 'A-01', name: 'Aisle A Row 1', sortOrder: 1 },
    { id: nanoid(), code: 'A-02', name: 'Aisle A Row 2', sortOrder: 2 },
    { id: nanoid(), code: 'B-01', name: 'Aisle B Row 1', sortOrder: 3 },
    { id: nanoid(), code: 'B-02', name: 'Aisle B Row 2', sortOrder: 4 },
    { id: nanoid(), code: 'C-01', name: 'Aisle C Row 1', sortOrder: 5 },
  ];

  for (const loc of sampleLocations) {
    await db.insert(locations).values(loc).onConflictDoNothing();
  }

  console.log('Seed complete!');
  console.log('Admin login: admin / admin123');
}

seed().catch(console.error);
```

**Step 2: Add seed script to package.json**

Add to scripts:
```json
{
  "db:seed": "npx tsx src/db/seed.ts"
}
```

**Step 3: Run seed**

```bash
pnpm db:seed
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add database seed script with admin user and locations"
```

---

## Phase 3: Dashboard & Quick Actions

### Task 3.1: Create Dashboard Page

**Files:**
- Create: `src/app/(app)/dashboard/page.tsx`
- Create: `src/app/(app)/dashboard/stats-cards.tsx`
- Create: `src/app/(app)/dashboard/quick-actions.tsx`
- Create: `src/app/(app)/dashboard/recent-transactions.tsx`
- Create: `src/app/(app)/dashboard/low-stock-alerts.tsx`

**Step 1: Create stats cards component**

Create `src/app/(app)/dashboard/stats-cards.tsx`:
```typescript
import { db } from '@/db';
import { transactions } from '@/db/schema';
import { sql, eq, and, gte } from 'drizzle-orm';
import { Card, CardContent } from '@/components/ui/card';
import { Package, PackageCheck, ArrowRightLeft } from 'lucide-react';

async function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];

  const stats = await db
    .select({
      type: transactions.type,
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .where(gte(transactions.createdAt, today))
    .groupBy(transactions.type);

  return {
    inbound: stats.find((s) => s.type === 'IN')?.count || 0,
    outbound: stats.find((s) => s.type === 'OUT')?.count || 0,
    transfer: stats.find((s) => s.type === 'MOVE')?.count || 0,
  };
}

export async function StatsCards() {
  const stats = await getTodayStats();

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <Package className="h-6 w-6 text-green-600" />
          <span className="mt-1 text-2xl font-bold">{stats.inbound}</span>
          <span className="text-xs text-muted-foreground">Inbound</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <PackageCheck className="h-6 w-6 text-blue-600" />
          <span className="mt-1 text-2xl font-bold">{stats.outbound}</span>
          <span className="text-xs text-muted-foreground">Outbound</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <ArrowRightLeft className="h-6 w-6 text-orange-600" />
          <span className="mt-1 text-2xl font-bold">{stats.transfer}</span>
          <span className="text-xs text-muted-foreground">Transfer</span>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Create quick actions component**

Create `src/app/(app)/dashboard/quick-actions.tsx`:
```typescript
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Package, PackageCheck, ArrowRightLeft, ClipboardList, Undo2 } from 'lucide-react';

const actions = [
  { href: '/ops/inbound', icon: Package, labelKey: 'inbound', color: 'text-green-600' },
  { href: '/ops/outbound', icon: PackageCheck, labelKey: 'outbound', color: 'text-blue-600' },
  { href: '/ops/transfer', icon: ArrowRightLeft, labelKey: 'transfer', color: 'text-orange-600' },
  { href: '/ops/stocktake', icon: ClipboardList, labelKey: 'stocktake', color: 'text-purple-600' },
  { href: '/ops/return', icon: Undo2, labelKey: 'return', color: 'text-red-600' },
];

export function QuickActions() {
  const t = useTranslations('ops');

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="transition-colors hover:bg-accent">
            <CardContent className="flex flex-col items-center p-4">
              <action.icon className={`h-8 w-8 ${action.color}`} />
              <span className="mt-2 text-sm">{t(action.labelKey)}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
```

**Step 3: Create dashboard page**

Create `src/app/(app)/dashboard/page.tsx`:
```typescript
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { StatsCards } from './stats-cards';
import { QuickActions } from './quick-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');

  return (
    <>
      <Header />
      <div className="space-y-6 p-4">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('todayActivity')}
          </h2>
          <Suspense fallback={<div>Loading...</div>}>
            <StatsCards />
          </Suspense>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('quickActions')}
          </h2>
          <QuickActions />
        </section>
      </div>
    </>
  );
}
```

**Step 4: Create redirect from root**

Update `src/app/page.tsx`:
```typescript
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/dashboard');
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: create dashboard with stats cards and quick actions"
```

---

## Phase 4: Core Operations (Abbreviated for Length)

### Task 4.1-4.5: Operation Pages

Each operation (Inbound, Outbound, Transfer, Stocktake, Return) follows the same pattern:

**Files per operation:**
- `src/app/(app)/ops/[operation]/page.tsx` - Page component
- `src/app/(app)/ops/[operation]/[operation]-form.tsx` - Form component
- `src/app/(app)/ops/[operation]/actions.ts` - Server actions

**Shared components needed:**
- `src/components/scanner/qr-scanner.tsx` - QR scanner wrapper
- `src/components/product/product-card.tsx` - Display product info
- `src/components/form/quantity-stepper.tsx` - +/- quantity input
- `src/components/form/location-select.tsx` - Location dropdown

Each operation:
1. Scan/search for product
2. Display product info + current stock
3. Input quantities with stepper
4. Select location/document (optional)
5. Submit via server action
6. Update inventory + create transaction

**Key business logic for Outbound (auto-unboxing):**

```typescript
// src/lib/inventory.ts
export function calculateOutbound(
  currentBoxes: number,
  currentPcs: number,
  pcsPerBox: number,
  requestedPcs: number
): { newBoxes: number; newPcs: number } | null {
  const totalAvailable = currentBoxes * pcsPerBox + currentPcs;

  if (requestedPcs > totalAvailable) {
    return null; // Not enough stock
  }

  let remaining = totalAvailable - requestedPcs;
  const newBoxes = Math.floor(remaining / pcsPerBox);
  const newPcs = remaining % pcsPerBox;

  return { newBoxes, newPcs };
}
```

---

## Phase 5: Products & Locations Management

### Task 5.1: Products CRUD

**Files:**
- `src/app/(app)/more/products/page.tsx`
- `src/app/(app)/more/products/product-list.tsx`
- `src/app/(app)/more/products/[id]/page.tsx`
- `src/app/(app)/more/products/new/page.tsx`
- `src/app/(app)/more/products/actions.ts`

### Task 5.2: QR Code Generation & Printing

**Files:**
- `src/app/(app)/more/products/print/page.tsx`
- `src/lib/qr.ts`
- `src/components/print/label-preview.tsx`

### Task 5.3: CSV Import

**Files:**
- `src/app/(app)/more/products/import/page.tsx`
- `src/lib/csv-parser.ts`
- `src/app/api/templates/[type]/route.ts`

---

## Phase 6: Reports & Export

### Task 6.1: Inventory Report
### Task 6.2: Transaction History
### Task 6.3: Charts (Recharts)
### Task 6.4: Excel Export

---

## Phase 7: User Management & Settings

### Task 7.1: User Management (Admin)
### Task 7.2: Settings Page
### Task 7.3: Location Management

---

## Execution Checklist

- [ ] Phase 1: Project Setup (Tasks 1.1-1.7)
- [ ] Phase 2: Authentication (Tasks 2.1-2.2)
- [ ] Phase 3: Dashboard (Task 3.1)
- [ ] Phase 4: Core Operations (Tasks 4.1-4.5)
- [ ] Phase 5: Products Management (Tasks 5.1-5.3)
- [ ] Phase 6: Reports & Export (Tasks 6.1-6.4)
- [ ] Phase 7: User Management (Tasks 7.1-7.3)

---

**Estimated commits:** ~25-30 atomic commits
**Testing approach:** Manual testing after each task, verify on mobile viewport
