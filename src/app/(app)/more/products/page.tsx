import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { ProductList } from './product-list';
import { getProducts } from './actions';

export default async function ProductsPage() {
  const t = await getTranslations('products');
  const products = await getProducts();

  return (
    <>
      <Header title={t('title')} showBack />
      <div className="p-4">
        <ProductList initialProducts={products} />
      </div>
    </>
  );
}
