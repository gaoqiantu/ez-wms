import { getInvoice } from '../../actions';
import { InvoicePrint } from './invoice-print';
import { notFound } from 'next/navigation';

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id);

  if (!invoice) {
    notFound();
  }

  return <InvoicePrint invoice={invoice} />;
}
