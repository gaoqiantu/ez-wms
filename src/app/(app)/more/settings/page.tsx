import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { SettingsForm } from './settings-form';
import { auth } from '@/lib/auth';
import { getSetting } from './actions';

export default async function SettingsPage() {
  const t = await getTranslations('more');
  const session = await auth();
  const invoiceStartNumber = await getSetting('invoice_next_number') || '1001';

  return (
    <>
      <Header title={t('settings')} showBack />
      <div className="p-4">
        <SettingsForm
          userName={session?.user?.name || ''}
          invoiceStartNumber={invoiceStartNumber}
        />
      </div>
    </>
  );
}
