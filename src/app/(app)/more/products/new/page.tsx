import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { ProductForm } from '../product-form';

export default async function NewProductPage() {
  const t = await getTranslations('products');

  return (
    <>
      <Header title={t('add')} showBack />
      <div className="p-4">
        <ProductForm />
      </div>
    </>
  );
}
