import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { LocationsList } from './locations-list';
import { getLocations } from './actions';

export default async function LocationsPage() {
  const t = await getTranslations('more');
  const locations = await getLocations();

  return (
    <>
      <Header title={t('locations')} showBack />
      <div className="p-4">
        <LocationsList initialLocations={locations} />
      </div>
    </>
  );
}
