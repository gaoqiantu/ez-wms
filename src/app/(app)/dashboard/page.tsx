import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { StatsCards } from './stats-cards';
import { QuickActions } from './quick-actions';

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
            {t('quickActions')}
          </h2>
          <QuickActions />
        </section>
      </div>
    </>
  );
}
