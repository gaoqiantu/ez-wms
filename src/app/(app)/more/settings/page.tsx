import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { SettingsForm } from './settings-form';
import { auth } from '@/lib/auth';

export default async function SettingsPage() {
  const t = await getTranslations('more');
  const session = await auth();

  return (
    <>
      <Header title={t('settings')} showBack />
      <div className="p-4">
        <SettingsForm userName={session?.user?.name || ''} />
      </div>
    </>
  );
}
