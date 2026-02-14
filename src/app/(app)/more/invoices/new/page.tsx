import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { InvoiceForm } from '../invoice-form';
import { getNextInvoiceNumber } from '../actions';
import { getComboboxOptions } from '../../settings/actions';

export default async function NewInvoicePage() {
  const t = await getTranslations('invoices');

  const [nextInvoiceNo, termsOptions, repOptions, viaOptions, shipOptions] = await Promise.all([
    getNextInvoiceNumber(),
    getComboboxOptions('terms_options'),
    getComboboxOptions('rep_options'),
    getComboboxOptions('via_options'),
    getComboboxOptions('ship_options'),
  ]);

  return (
    <>
      <Header title={t('new')} showBack />
      <div className="p-4">
        <InvoiceForm
          nextInvoiceNo={nextInvoiceNo}
          termsOptions={termsOptions}
          repOptions={repOptions}
          viaOptions={viaOptions}
          shipOptions={shipOptions}
        />
      </div>
    </>
  );
}
