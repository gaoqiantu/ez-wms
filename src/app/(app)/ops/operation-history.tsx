import { getTranslations } from 'next-intl/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { OperationHistoryItem } from './actions';

interface OperationHistoryProps {
  items: OperationHistoryItem[];
}

function formatDateTime(date: Date | null) {
  if (!date) return '';
  return new Date(date).toLocaleString();
}

function formatQty(value: number, unit: string) {
  if (value === 0) return null;
  return `${value > 0 ? '+' : ''}${value} ${unit}`;
}

export async function OperationHistory({ items }: OperationHistoryProps) {
  const [tOps, tCommon] = await Promise.all([
    getTranslations('ops'),
    getTranslations('common'),
  ]);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          {tCommon('noData')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        const boxText = formatQty(item.boxQty, tOps('boxes'));
        const pcsText = formatQty(item.pcsQty, tOps('pieces'));
        const locationText = item.type === 'MOVE'
          ? `${item.fromLocation || '-'} -> ${item.toLocation || '-'}`
          : (item.fromLocation || item.toLocation || '-');

        return (
          <Card key={item.id}>
            <CardContent className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{item.itemCode}</span>
                    <Badge variant="outline">{locationText}</Badge>
                  </div>
                  {item.productDescription && (
                    <p className="truncate text-sm text-muted-foreground">{item.productDescription}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {boxText && <span>{boxText}</span>}
                    {pcsText && <span>{pcsText}</span>}
                    <span>{item.operatorName}</span>
                  </div>
                  {item.remark && (
                    <p className="truncate text-xs text-muted-foreground">{item.remark}</p>
                  )}
                </div>
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
