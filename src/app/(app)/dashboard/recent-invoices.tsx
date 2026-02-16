import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { desc } from 'drizzle-orm';
import { db } from '@/db';
import { invoices } from '@/db/schema';
import { auth } from '@/lib/auth';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const RECENT_INVOICE_LIMIT = 5;

async function getRecentInvoices() {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }

  return db.query.invoices.findMany({
    orderBy: [desc(invoices.createdAt)],
    limit: RECENT_INVOICE_LIMIT,
  });
}

export async function RecentInvoices() {
  const [tInvoices, tCommon, rows] = await Promise.all([
    getTranslations('invoices'),
    getTranslations('common'),
    getRecentInvoices(),
  ]);

  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            {tCommon('noData')}
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/more/invoices/${invoice.id}`}
                className="block px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">#{invoice.invoiceNo}</span>
                      <Badge
                        variant={invoice.status === 'completed' ? 'default' : 'secondary'}
                        className={
                          invoice.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                        }
                      >
                        {tInvoices(invoice.status)}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {invoice.billToName || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">${(invoice.total || 0).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(invoice.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
