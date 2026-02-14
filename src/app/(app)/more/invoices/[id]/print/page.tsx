import { getInvoice } from '../../actions';
import { getSetting } from '../../../settings/actions';
import { InvoicePrint } from './invoice-print';
import { notFound } from 'next/navigation';

const DEFAULT_COMPANY_INFO = {
  name: '',
  address: '',
  phone: '',
  email: '',
  paymentInfo: '',
};

export default async function InvoicePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [invoice, companyInfoRaw] = await Promise.all([
    getInvoice(id),
    getSetting('company_info'),
  ]);

  if (!invoice) {
    notFound();
  }

  let companyInfo = DEFAULT_COMPANY_INFO;
  if (companyInfoRaw) {
    try {
      companyInfo = { ...DEFAULT_COMPANY_INFO, ...JSON.parse(companyInfoRaw) };
    } catch {
      // Use defaults
    }
  }

  return <InvoicePrint invoice={invoice} companyInfo={companyInfo} />;
}
