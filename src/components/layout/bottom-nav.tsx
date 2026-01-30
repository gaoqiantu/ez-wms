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
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 min-h-[56px] min-w-[72px] rounded-lg transition-all active:scale-95 active:bg-accent/50',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
              <span className="text-xs font-medium">{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
