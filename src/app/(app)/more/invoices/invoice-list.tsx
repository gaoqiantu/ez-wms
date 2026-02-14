'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus } from 'lucide-react';
import { getInvoices } from './actions';
import type { Invoice } from '@/db/schema';

interface InvoiceListProps {
  initialInvoices: Invoice[];
}

export function InvoiceList({ initialInvoices }: InvoiceListProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');

  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search) {
        setIsSearching(true);
        const results = await getInvoices(search);
        setInvoices(results);
        setIsSearching(false);
      } else {
        setInvoices(initialInvoices);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, initialInvoices]);

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tCommon('search')}
            className="pl-9"
          />
        </div>
        <Link href="/more/invoices/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            {t('new')}
          </Button>
        </Link>
      </div>

      {isSearching ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('loading')}
        </div>
      ) : invoices.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <Link key={invoice.id} href={`/more/invoices/${invoice.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold">
                          #{invoice.invoiceNo}
                        </span>
                        <Badge
                          variant={invoice.status === 'completed' ? 'default' : 'secondary'}
                          className={
                            invoice.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                          }
                        >
                          {t(invoice.status)}
                        </Badge>
                      </div>
                      {invoice.billToName && (
                        <p className="text-sm text-muted-foreground">{invoice.billToName}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${(invoice.total || 0).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(invoice.date)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
