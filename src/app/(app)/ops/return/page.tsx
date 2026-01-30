import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations } from '../actions';
import { ReturnForm } from './return-form';

export default async function ReturnPage() {
  const t = await getTranslations('ops');
  const locations = await getLocations();

  return (
    <>
      <Header title={t('return')} showBack />
      <div className="p-4">
        <ReturnForm locations={locations} />
      </div>
    </>
  );
}
