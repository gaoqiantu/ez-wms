import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { ExportForm } from './export-form';

export default async function ExportPage() {
  const t = await getTranslations('more');

  return (
    <>
      <Header title={t('export')} showBack />
      <div className="p-4">
        <ExportForm />
      </div>
    </>
  );
}
