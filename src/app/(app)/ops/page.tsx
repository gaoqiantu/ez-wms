import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, PackageCheck, ArrowRightLeft, ClipboardList, Undo2 } from 'lucide-react';

const operations = [
  {
    href: '/ops/inbound',
    icon: Package,
    labelKey: 'inbound',
    descKey: 'inboundDesc',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    href: '/ops/outbound',
    icon: PackageCheck,
    labelKey: 'outbound',
    descKey: 'outboundDesc',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    href: '/ops/transfer',
    icon: ArrowRightLeft,
    labelKey: 'transfer',
    descKey: 'transferDesc',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    href: '/ops/stocktake',
    icon: ClipboardList,
    labelKey: 'stocktake',
    descKey: 'stocktakeDesc',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    href: '/ops/return',
    icon: Undo2,
    labelKey: 'return',
    descKey: 'returnDesc',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
];

export default async function OpsPage() {
  const t = await getTranslations('ops');

  return (
    <>
      <Header title={t('title') || 'Operations'} />
      <div className="space-y-3 p-4">
        {operations.map((op) => (
          <Link key={op.href} href={op.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <div className={`rounded-lg p-3 ${op.bgColor}`}>
                  <op.icon className={`h-6 w-6 ${op.color}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{t(op.labelKey)}</CardTitle>
                  <CardDescription>{t(op.descKey)}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
