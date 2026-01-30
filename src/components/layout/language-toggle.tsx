'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function LanguageToggle() {
  const router = useRouter();

  const toggleLocale = async () => {
    const currentLocale = document.cookie
      .split('; ')
      .find((row) => row.startsWith('locale='))
      ?.split('=')[1] || 'en';

    const newLocale = currentLocale === 'en' ? 'zh' : 'en';
    document.cookie = `locale=${newLocale}; path=/; max-age=31536000`;
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={toggleLocale}>
      中/EN
    </Button>
  );
}
