import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { auth } from '@/lib/auth';
import {
  Package,
  MapPin,
  FileText,
  Users,
  Settings,
  Download,
  Printer,
  Upload
} from 'lucide-react';

const menuItems = [
  {
    href: '/more/products',
    icon: Package,
    labelKey: 'products',
    descKey: 'productsDesc',
    adminOnly: false
  },
  {
    href: '/more/products/print',
    icon: Printer,
    labelKey: 'printLabels',
    descKey: 'printLabelsDesc',
    adminOnly: false
  },
  {
    href: '/more/products/import',
    icon: Upload,
    labelKey: 'import',
    descKey: 'importDesc',
    adminOnly: false
  },
  {
    href: '/more/locations',
    icon: MapPin,
    labelKey: 'locations',
    descKey: 'locationsDesc',
    adminOnly: false
  },
  {
    href: '/more/documents',
    icon: FileText,
    labelKey: 'documents',
    descKey: 'documentsDesc',
    adminOnly: false
  },
  {
    href: '/more/export',
    icon: Download,
    labelKey: 'export',
    descKey: 'exportDesc',
    adminOnly: false
  },
  {
    href: '/more/users',
    icon: Users,
    labelKey: 'users',
    descKey: 'usersDesc',
    adminOnly: true
  },
  {
    href: '/more/settings',
    icon: Settings,
    labelKey: 'settings',
    descKey: 'settingsDesc',
    adminOnly: false
  },
];

export default async function MorePage() {
  const t = await getTranslations('more');
  const session = await auth();
  const isAdmin = session?.user?.role === 'admin';

  const visibleItems = menuItems.filter(
    item => !item.adminOnly || isAdmin
  );

  return (
    <>
      <Header title={t('title')} />
      <div className="space-y-2 p-4">
        {visibleItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardHeader className="flex flex-row items-center gap-4 p-4">
                <div className="rounded-lg bg-muted p-2">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base">{t(item.labelKey)}</CardTitle>
                  <CardDescription className="text-sm">
                    {t(item.descKey)}
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
