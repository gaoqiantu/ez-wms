import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { InvoiceList } from './invoice-list';
import { getInvoices } from './actions';

export default async function InvoicesPage() {
  const t = await getTranslations('invoices');
  const invoices = await getInvoices();

  return (
    <>
      <Header title={t('title')} showBack />
      <div className="p-4">
        <InvoiceList initialInvoices={invoices} />
      </div>
    </>
  );
}
