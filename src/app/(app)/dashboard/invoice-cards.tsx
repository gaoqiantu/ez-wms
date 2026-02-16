import { Card, CardContent } from '@/components/ui/card';
import { FileClock, Receipt, DollarSign } from 'lucide-react';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { auth } from '@/lib/auth';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import { getTranslations } from 'next-intl/server';

interface InvoiceDashboardStats {
  draftInvoices: number;
  completedToday: number;
  salesToday: number;
}

const EMPTY_INVOICE_STATS: InvoiceDashboardStats = {
  draftInvoices: 0,
  completedToday: 0,
  salesToday: 0,
};

async function getInvoiceStats(): Promise<InvoiceDashboardStats> {
  const session = await auth();
  if (!session?.user?.id) {
    return EMPTY_INVOICE_STATS;
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfDay);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [draftRows, completedTodayRows] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(invoices)
      .where(eq(invoices.status, 'draft')),
    db
      .select({
        count: sql<number>`count(*)`,
        total: sql<number>`coalesce(sum(${invoices.total}), 0)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.status, 'completed'),
          gte(invoices.date, startOfDay),
          lt(invoices.date, startOfTomorrow),
        ),
      ),
  ]);

  return {
    draftInvoices: Number(draftRows[0]?.count || 0),
    completedToday: Number(completedTodayRows[0]?.count || 0),
    salesToday: Number(completedTodayRows[0]?.total || 0),
  };
}

export async function InvoiceCards() {
  const [t, stats] = await Promise.all([
    getTranslations('dashboard'),
    getInvoiceStats(),
  ]);

  return (
    <div className="grid grid-cols-3 gap-3">
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <FileClock className="h-6 w-6 text-amber-600" />
          <span className="mt-1 text-2xl font-bold">{stats.draftInvoices}</span>
          <span className="text-xs text-muted-foreground">{t('draftInvoices')}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <Receipt className="h-6 w-6 text-blue-600" />
          <span className="mt-1 text-2xl font-bold">{stats.completedToday}</span>
          <span className="text-xs text-muted-foreground">{t('completedToday')}</span>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex flex-col items-center p-4">
          <DollarSign className="h-6 w-6 text-green-600" />
          <span className="mt-1 text-2xl font-bold">${stats.salesToday.toFixed(2)}</span>
          <span className="text-xs text-muted-foreground">{t('salesToday')}</span>
        </CardContent>
      </Card>
    </div>
  );
}
