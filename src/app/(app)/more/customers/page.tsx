import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { CustomerList } from './customer-list';
import { getCustomers } from './actions';

export default async function CustomersPage() {
  const t = await getTranslations('customers');
  const customers = await getCustomers();

  return (
    <>
      <Header title={t('title')} showBack />
      <div className="p-4">
        <CustomerList initialCustomers={customers} />
      </div>
    </>
  );
}
