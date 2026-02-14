import { getTranslations } from 'next-intl/server';
import { Header } from '@/components/layout/header';
import { SettingsForm } from './settings-form';
import { auth } from '@/lib/auth';
import { getSetting } from './actions';

const DEFAULT_COMPANY_INFO = {
  name: '',
  address: '',
  phone: '',
  email: '',
  paymentInfo: '',
};

export default async function SettingsPage() {
  const t = await getTranslations('more');
  const [session, invoiceStartNumber, companyInfoRaw] = await Promise.all([
    auth(),
    getSetting('invoice_next_number'),
    getSetting('company_info'),
  ]);

  let companyInfo = DEFAULT_COMPANY_INFO;
  if (companyInfoRaw) {
    try {
      companyInfo = { ...DEFAULT_COMPANY_INFO, ...JSON.parse(companyInfoRaw) };
    } catch {
      // Use defaults
    }
  }

  return (
    <>
      <Header title={t('settings')} showBack />
      <div className="p-4">
        <SettingsForm
          userName={session?.user?.name || ''}
          invoiceStartNumber={invoiceStartNumber || '1001'}
          companyInfo={companyInfo}
        />
      </div>
    </>
  );
}
