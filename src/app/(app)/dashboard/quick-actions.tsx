'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Package, PackageCheck, ArrowRightLeft, ClipboardList, Undo2 } from 'lucide-react';

const actions = [
  { href: '/ops/inbound', icon: Package, labelKey: 'inbound', color: 'text-green-600' },
  { href: '/ops/outbound', icon: PackageCheck, labelKey: 'outbound', color: 'text-blue-600' },
  { href: '/ops/transfer', icon: ArrowRightLeft, labelKey: 'transfer', color: 'text-orange-600' },
  { href: '/ops/stocktake', icon: ClipboardList, labelKey: 'stocktake', color: 'text-purple-600' },
  { href: '/ops/return', icon: Undo2, labelKey: 'return', color: 'text-red-600' },
];

export function QuickActions() {
  const t = useTranslations('ops');

  return (
    <div className="grid grid-cols-3 gap-3">
      {actions.map((action) => (
        <Link key={action.href} href={action.href}>
          <Card className="transition-colors hover:bg-accent">
            <CardContent className="flex flex-col items-center p-4">
              <action.icon className={`h-8 w-8 ${action.color}`} />
              <span className="mt-2 text-sm">{t(action.labelKey)}</span>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
