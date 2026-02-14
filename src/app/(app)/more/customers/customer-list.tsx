'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { getCustomers } from './actions';
import type { Customer } from '@/db/schema';

interface CustomerListProps {
  initialCustomers: Customer[];
}

export function CustomerList({ initialCustomers }: CustomerListProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');

  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search) {
        setIsSearching(true);
        const results = await getCustomers(search);
        setCustomers(results);
        setIsSearching(false);
      } else {
        setCustomers(initialCustomers);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, initialCustomers]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="pl-9"
          />
        </div>
        <Link href="/more/customers/new">
          <Button>
            <Plus className="mr-1 h-4 w-4" />
            {t('add')}
          </Button>
        </Link>
      </div>

      {isSearching ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('loading')}
        </div>
      ) : customers.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {customers.map((customer) => (
            <Link key={customer.id} href={`/more/customers/${customer.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4">
                  <div className="space-y-1">
                    <h3 className="font-medium">{customer.name}</h3>
                    {customer.contactName && (
                      <p className="text-sm text-muted-foreground">{customer.contactName}</p>
                    )}
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    )}
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
