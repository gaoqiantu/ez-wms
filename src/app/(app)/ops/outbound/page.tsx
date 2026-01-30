import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations } from '../actions';
import { OutboundForm } from './outbound-form';

export default async function OutboundPage() {
  const t = await getTranslations('ops');
  const locations = await getLocations();

  return (
    <>
      <Header title={t('outbound')} showBack />
      <div className="p-4">
        <OutboundForm locations={locations} />
      </div>
    </>
  );
}
