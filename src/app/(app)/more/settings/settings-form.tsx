'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { signOut } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe, LogOut, Info, User } from 'lucide-react';

interface SettingsFormProps {
  userName: string;
}

export function SettingsForm({ userName }: SettingsFormProps) {
  const t = useTranslations('settings');
  const tAuth = useTranslations('auth');
  const router = useRouter();

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
