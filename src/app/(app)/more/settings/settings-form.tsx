'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, LogOut, Info, User, Receipt, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { setSetting } from './actions';

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  paymentInfo: string;
}

interface SettingsFormProps {
  userName: string;
  invoiceStartNumber: string;
  companyInfo: CompanyInfo;
}

export function SettingsForm({ userName, invoiceStartNumber, companyInfo: initialCompanyInfo }: SettingsFormProps) {
  const t = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [isPendingInvoice, startInvoiceTransition] = useTransition();
  const [isPendingCompany, startCompanyTransition] = useTransition();
  const [invoiceNumber, setInvoiceNumber] = useState(invoiceStartNumber);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);

  const [currentLocale, setCurrentLocale] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.cookie
        .split('; ')
        .find((row) => row.startsWith('locale='))
        ?.split('=')[1] || 'en';
    }
    return 'en';
  });

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
    setCurrentLocale(newLocale);
    router.refresh();
  };

  const handleSaveInvoiceNumber = () => {
    startInvoiceTransition(async () => {
      const result = await setSetting('invoice_next_number', invoiceNumber);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tCommon('success'));
      }
    });
  };

  const handleSaveCompanyInfo = () => {
    startCompanyTransition(async () => {
      const result = await setSetting('company_info', JSON.stringify(companyInfo));
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tCommon('success'));
      }
    });
  };

  const handleLogout = async () => {
    if (confirm(t('logoutConfirm'))) {
      await signOut({ callbackUrl: '/login' });
    }
  };

  return (
    <div className="space-y-4">
      {/* User Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('account')}</CardTitle>
              <CardDescription>{userName}</CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('language')}</CardTitle>
              <CardDescription>{t('languageDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Select value={currentLocale} onValueChange={handleLocaleChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('companyInfo')}</CardTitle>
              <CardDescription>{t('companyInfoDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            value={companyInfo.name}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, name: e.target.value }))}
            placeholder={t('companyName')}
          />
          <Input
            value={companyInfo.address}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, address: e.target.value }))}
            placeholder={t('companyAddress')}
          />
          <Input
            value={companyInfo.phone}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, phone: e.target.value }))}
            placeholder={t('companyPhone')}
          />
          <Input
            value={companyInfo.email}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, email: e.target.value }))}
            placeholder={t('companyEmail')}
          />
          <Textarea
            value={companyInfo.paymentInfo}
            onChange={(e) => setCompanyInfo(prev => ({ ...prev, paymentInfo: e.target.value }))}
            placeholder={t('paymentInfo')}
            rows={3}
          />
          <Button onClick={handleSaveCompanyInfo} disabled={isPendingCompany} className="w-full">
            {isPendingCompany ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {tCommon('save')}
          </Button>
        </CardContent>
      </Card>

      {/* Invoice Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Receipt className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('invoiceStartNumber')}</CardTitle>
              <CardDescription>{t('invoiceStartNumberDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              type="number"
              min="1"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            <Button onClick={handleSaveInvoiceNumber} disabled={isPendingInvoice}>
              {isPendingInvoice ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                tCommon('save')
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('about')}</CardTitle>
              <CardDescription>{t('aboutDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <p><strong>ez-wms</strong></p>
          <p>{t('version')}: 1.0.0</p>
          <p className="mt-2">{t('copyright')}</p>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleLogout}
      >
        <LogOut className="mr-2 h-4 w-4" />
        {tAuth('logout')}
      </Button>
    </div>
  );
}
