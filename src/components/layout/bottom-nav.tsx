'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Package, BarChart3, MoreHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', icon: Home, labelKey: 'dashboard' },
  { href: '/ops', icon: Package, labelKey: 'operations' },
  { href: '/reports', icon: BarChart3, labelKey: 'reports' },
  { href: '/more', icon: MoreHorizontal, labelKey: 'more' },
];

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
