import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { StatsCards } from './stats-cards';
import { QuickActions } from './quick-actions';
import { InvoiceCards } from './invoice-cards';
import { RecentInvoices } from './recent-invoices';

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
          <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}>
            <StatsCards />
          </Suspense>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('invoiceOverview')}
          </h2>
          <Suspense fallback={<div className="h-24 animate-pulse rounded-lg bg-muted" />}>
            <InvoiceCards />
          </Suspense>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            {t('recentInvoices')}
          </h2>
          <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
            <RecentInvoices />
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
