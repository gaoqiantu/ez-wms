import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { InvoiceForm } from '../invoice-form';
import { InvoiceDetail } from './invoice-detail';
import { getInvoice } from '../actions';
import { getComboboxOptions } from '../../settings/actions';
import { getLocations } from '../../../ops/actions';
import { notFound } from 'next/navigation';

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [t, { id }] = await Promise.all([
    getTranslations('invoices'),
    params,
  ]);
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  if (invoice.status === 'completed') {
    return (
      <>
        <Header title={`${t('invoiceNo')} ${invoice.invoiceNo}`} showBack />
        <div className="p-4">
          <InvoiceDetail invoice={invoice} />
        </div>
      </>
    );
  }

  // Draft mode - show editable form with action buttons
  const [termsOptions, repOptions, viaOptions, shipOptions, locations] = await Promise.all([
    getComboboxOptions('terms_options'),
    getComboboxOptions('rep_options'),
    getComboboxOptions('via_options'),
    getComboboxOptions('ship_options'),
    getLocations(),
  ]);

  return (
    <>
      <Header title={`${t('invoiceNo')} ${invoice.invoiceNo}`} showBack />
      <div className="p-4">
        <InvoiceForm
          invoice={invoice}
          nextInvoiceNo={invoice.invoiceNo}
          termsOptions={termsOptions}
          repOptions={repOptions}
          viaOptions={viaOptions}
          shipOptions={shipOptions}
        />
        <InvoiceDetail invoice={invoice} locations={locations} isDraft />
      </div>
    </>
  );
}
