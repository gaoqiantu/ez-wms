import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { ImportForm } from './import-form';

export default async function ImportPage() {
  const t = await getTranslations('more');

  return (
    <>
      <Header title={t('import')} showBack />
      <div className="p-4">
        <ImportForm />
      </div>
    </>
  );
}
