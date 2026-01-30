import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations } from '../actions';
import { StocktakeForm } from './stocktake-form';

export default async function StocktakePage() {
  const t = await getTranslations('ops');
  const locations = await getLocations();

  return (
    <>
      <Header title={t('stocktake')} showBack />
      <div className="p-4">
        <StocktakeForm locations={locations} />
      </div>
    </>
  );
}
