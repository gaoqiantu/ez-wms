import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations } from '../actions';
import { InboundForm } from './inbound-form';

export default async function InboundPage() {
  const t = await getTranslations('ops');
  const locations = await getLocations();

  return (
    <>
      <Header title={t('inbound')} showBack />
      <div className="p-4">
        <InboundForm locations={locations} />
      </div>
    </>
  );
}
