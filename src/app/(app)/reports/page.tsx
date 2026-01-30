import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ClipboardList, History, BarChart3 } from 'lucide-react';

const reportItems = [
  {
    href: '/reports/inventory',
    icon: ClipboardList,
    labelKey: 'inventory',
    descKey: 'inventoryDesc',
  },
  {
    href: '/reports/transactions',
    icon: History,
    labelKey: 'transactions',
    descKey: 'transactionsDesc',
  },
  {
    href: '/reports/charts',
    icon: BarChart3,
    labelKey: 'charts',
    descKey: 'chartsDesc',
  },
];

export default async function ReportsPage() {
  const t = await getTranslations('reports');

  return (
    <>
      <Header title={t('title')} />
      <div className="space-y-2 p-4">
        {reportItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <div className="rounded-lg bg-muted p-2">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{t(item.labelKey)}</CardTitle>
                  <CardDescription className="text-sm">
                    {t(item.descKey)}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
