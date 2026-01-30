import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { ProductForm } from '../product-form';
import { getProduct } from '../actions';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('products');
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <>
      <Header title={t('edit')} showBack />
      <div className="p-4">
        <ProductForm product={product} />
      </div>
    </>
  );
}
