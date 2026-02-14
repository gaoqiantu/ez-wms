'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Search, Plus } from 'lucide-react';
import { getProducts } from './actions';
import type { Product } from '@/db/schema';

interface ProductListProps {
  initialProducts: Product[];
}

export function ProductList({ initialProducts }: ProductListProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');

  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (search) {
        setIsSearching(true);
        const results = await getProducts(search);
        setProducts(results);
        setIsSearching(false);
      } else {
        setProducts(initialProducts);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [search, initialProducts]);

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
        <Link href="/more/products/new">
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
      ) : products.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((product) => (
            <Link key={product.id} href={`/more/products/${product.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">
                          {product.itemCode}
                        </span>
                      </div>
                      <h3 className="font-medium">{product.description}</h3>
                      <div className="text-sm text-muted-foreground">
                        ${product.priceEach.toFixed(2)} / {product.unit}
                      </div>
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
