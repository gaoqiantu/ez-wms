import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { InventoryReport } from './inventory-report';
import { getInventoryReport, getLocationsForFilter, getInventorySummary } from './actions';

export default async function InventoryReportPage() {
  const t = await getTranslations('reports');
  const [data, locations, summary] = await Promise.all([
    getInventoryReport(),
    getLocationsForFilter(),
    getInventorySummary(),
  ]);

  return (
    <>
      <Header title={t('inventory')} showBack />
      <div className="p-4">
        <InventoryReport
          initialData={data}
          locations={locations}
          summary={summary}
        />
      </div>
    </>
  );
}
