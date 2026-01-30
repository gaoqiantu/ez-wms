import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { PrintForm } from './print-form';
import { getProducts } from '../actions';

export default async function PrintPage() {
  const t = await getTranslations('more');
  const products = await getProducts();

  return (
    <>
      <Header title={t('printLabels')} showBack />
      <div className="p-4">
        <PrintForm products={products} />
      </div>
    </>
  );
}
