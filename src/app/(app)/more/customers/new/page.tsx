import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { CustomerForm } from '../customer-form';

export default async function NewCustomerPage() {
  const t = await getTranslations('customers');

  return (
    <>
      <Header title={t('add')} showBack />
      <div className="p-4">
        <CustomerForm />
      </div>
    </>
  );
}
