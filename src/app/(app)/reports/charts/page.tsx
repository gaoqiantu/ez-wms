import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { ChartsView } from './charts-view';
import { getDailyMovement, getTopProducts, getStockByLocation } from './actions';

export default async function ChartsPage() {
  const t = await getTranslations('reports');

  const [dailyData, topProducts, stockByLocation] = await Promise.all([
    getDailyMovement(7),
    getTopProducts(10),
    getStockByLocation(),
  ]);

  return (
    <>
      <Header title={t('charts')} showBack />
      <div className="p-4">
        <ChartsView
          initialDailyData={dailyData}
          initialTopProducts={topProducts}
          initialStockByLocation={stockByLocation}
        />
      </div>
    </>
  );
}
