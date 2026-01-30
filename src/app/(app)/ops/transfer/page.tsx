import { Header } from '@/components/layout/header';
import { getTranslations } from 'next-intl/server';
import { getLocations } from '../actions';
import { TransferForm } from './transfer-form';

export default async function TransferPage() {
  const t = await getTranslations('ops');
  const locations = await getLocations();

  return (
    <>
      <Header title={t('transfer')} showBack />
      <div className="p-4">
        <TransferForm locations={locations} />
      </div>
    </>
  );
}
