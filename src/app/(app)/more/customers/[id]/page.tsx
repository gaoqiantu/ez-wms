import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { CustomerForm } from '../customer-form';
import { getCustomer } from '../actions';
import { notFound } from 'next/navigation';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations('customers');
  const { id } = await params;
  const customer = await getCustomer(id);

  if (!customer) {
    notFound();
  }

  return (
    <>
      <Header title={t('edit')} showBack />
      <div className="p-4">
        <CustomerForm customer={customer} />
      </div>
    </>
  );
}
