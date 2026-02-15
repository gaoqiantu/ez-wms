import { getInvoice } from '../../actions';
import { getSetting } from '../../../settings/actions';
import { InvoicePrint } from './invoice-print';
import { notFound } from 'next/navigation';

const DEFAULT_COMPANY_INFO = {
  name: 'CitiQuartz Atlanta INC',
  address: '6654 Jimmy Carter Blvd STE B, Peachtree Corners, GA 30071',
  phone: '770-560-5858 / 770-618-9889',
  email: 'citiquartzatlanta@gmail.com',
  paymentInfo: 'Please make checks payable to: CitiQuartz Atlanta INC\nZelle payment to: 770-560-5858',
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
