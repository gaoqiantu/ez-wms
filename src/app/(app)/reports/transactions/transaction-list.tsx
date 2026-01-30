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
import { Search, Package, PackageCheck, ArrowRightLeft, ClipboardList, Undo2 } from 'lucide-react';
import { getTransactions } from './actions';

interface Transaction {
  id: string;
  type: string;
  createdAt: Date | null;
  boxQty: number;
  pcsQty: number;
  fromLocation: string | null;
  toLocation: string | null;
  remark: string | null;
  sku: string;
  productName: string;
  operatorName: string;
}

const typeConfig = {
  IN: { icon: Package, color: 'bg-green-100 text-green-800', label: 'Inbound' },
  OUT: { icon: PackageCheck, color: 'bg-blue-100 text-blue-800', label: 'Outbound' },
  MOVE: { icon: ArrowRightLeft, color: 'bg-orange-100 text-orange-800', label: 'Transfer' },
  CHECK: { icon: ClipboardList, color: 'bg-purple-100 text-purple-800', label: 'Stocktake' },
  RETURN: { icon: Undo2, color: 'bg-red-100 text-red-800', label: 'Return' },
};

interface TransactionListProps {
  initialData: Transaction[];
}

export function TransactionList({ initialData }: TransactionListProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const tOps = useTranslations('ops');

  const [data, setData] = useState(initialData);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const results = await getTransactions({
      search: search || undefined,
      type: type !== 'all' ? type : undefined,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
    });
    setData(results);
    setIsLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(fetchData, 300);
    return () => clearTimeout(timer);
  }, [search, type, fromDate, toDate]);

  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatQty = (box: number, pcs: number) => {
    const parts = [];
    if (box && box !== 0) parts.push(`${box > 0 ? '+' : ''}${box}box`);
    if (pcs && pcs !== 0) parts.push(`${pcs > 0 ? '+' : ''}${pcs}pcs`);
    return parts.join(' ') || '0';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-2">
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
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="IN">{tOps('inbound')}</SelectItem>
              <SelectItem value="OUT">{tOps('outbound')}</SelectItem>
              <SelectItem value="MOVE">{tOps('transfer')}</SelectItem>
              <SelectItem value="CHECK">{tOps('stocktake')}</SelectItem>
              <SelectItem value="RETURN">{tOps('return')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="flex-1"
            placeholder={t('from')}
          />
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="flex-1"
            placeholder={t('to')}
          />
        </div>
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
          {data.map((item) => {
            const config = typeConfig[item.type as keyof typeof typeConfig];
            const Icon = config?.icon || Package;

            return (
              <Card key={item.id}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={`rounded p-1.5 ${config?.color || 'bg-gray-100'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-sm font-medium">{item.sku}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {item.productName}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs">
                        <span className="font-medium">{formatQty(item.boxQty, item.pcsQty)}</span>
                        {item.type === 'MOVE' ? (
                          <span>{item.fromLocation} → {item.toLocation}</span>
                        ) : (
                          item.toLocation && <Badge variant="outline">{item.toLocation}</Badge>
                        )}
                        <span className="ml-auto text-muted-foreground">{item.operatorName}</span>
                      </div>
                      {item.remark && (
                        <div className="mt-1 text-xs text-muted-foreground truncate">
                          {item.remark}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
