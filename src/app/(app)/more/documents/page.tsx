import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { DocumentsList } from './documents-list';
import { getDocuments } from './actions';

export default async function DocumentsPage() {
  const t = await getTranslations('more');
  const documents = await getDocuments();

  return (
    <>
      <Header title={t('documents')} showBack />
      <div className="p-4">
        <DocumentsList initialDocuments={documents} />
      </div>
    </>
  );
}
