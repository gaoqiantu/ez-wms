'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import { getInventoryReport } from './actions';
import type { Location } from '@/db/schema';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  brand: string | null;
  spec: string | null;
  color: string | null;
  location: string;
  boxQty: number | null;
  pcsQty: number | null;
  totalPcs: number;
  totalArea: number;
}

interface InventoryReportProps {
  initialData: InventoryItem[];
  locations: Location[];
  summary: { totalSku: number; totalBoxes: number; totalPcs: number };
}

export function InventoryReport({ initialData, locations, summary }: InventoryReportProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const tInv = useTranslations('inventory');

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const results = await getInventoryReport(search || undefined, location);
      setData(results);
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, location]);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{summary.totalSku}</div>
            <div className="text-xs text-muted-foreground">SKUs</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{summary.totalBoxes || 0}</div>
            <div className="text-xs text-muted-foreground">{tInv('boxQty')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold">{summary.totalPcs || 0}</div>
            <div className="text-xs text-muted-foreground">{tInv('pcsQty')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
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
        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc.id} value={loc.code}>
                {loc.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Data */}
      {isLoading ? (
        <div className="py-8 text-center text-muted-foreground">
          {tCommon('loading')}
        </div>
      ) : data.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {t('noData')}
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold">{item.sku}</span>
                      <Badge variant="outline">{item.location}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.name}
                      {item.spec && ` - ${item.spec}`}
                      {item.color && ` - ${item.color}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      <span className="font-medium">{item.boxQty || 0}</span> box
                      {(item.boxQty || 0) !== 1 && 'es'} +{' '}
                      <span className="font-medium">{item.pcsQty || 0}</span> pcs
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('total')}: {item.totalPcs} pcs
                      {item.totalArea > 0 && ` / ${item.totalArea.toFixed(2)} m\u00B2`}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
