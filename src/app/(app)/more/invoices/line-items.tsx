'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const QrScanner = dynamic(
  () => import('@/components/scanner/qr-scanner').then(mod => mod.QrScanner),
  { ssr: false }
);
import { searchProduct } from '../../ops/actions';
import { toast } from 'sonner';

export interface LineItem {
  _key: string;
  productId?: string;
  itemCode: string;
  description: string;
  priceEach: number;
  quantity: number;
}

interface LineItemsProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

let keyCounter = 0;
export function generateItemKey() {
  return `item-${Date.now()}-${++keyCounter}`;
}

export function LineItems({ items, onChange }: LineItemsProps) {
  const t = useTranslations('invoices');
  const [showScanner, setShowScanner] = useState(false);

  const handleScan = useCallback(async (value: string) => {
    const product = await searchProduct(value);
    if (product) {
      onChange([...items, {
        _key: generateItemKey(),
        productId: product.id,
        itemCode: product.itemCode,
        description: product.description || '',
        priceEach: product.priceEach,
        quantity: 1,
      }]);
      setShowScanner(false);
    } else {
      toast.error(t('productNotFound') || 'Product not found');
    }
  }, [items, onChange, t]);

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const total = items.reduce((sum, item) => sum + item.quantity * item.priceEach, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{t('lineItems')}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowScanner(!showScanner)}
        >
          <Plus className="mr-1 h-3 w-3" />
          {t('addItem')}
        </Button>
      </div>

      {showScanner && (
        <QrScanner onScan={handleScan} />
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={item._key} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <div className="font-mono text-sm font-medium">{item.itemCode}</div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="text-xs text-muted-foreground">{t('quantity')}</label>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    min={1}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('priceEach')}</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.priceEach}
                    onChange={(e) => handleItemChange(index, 'priceEach', Math.max(0, parseFloat(e.target.value) || 0))}
                    min={0}
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">{t('amount')}</label>
                  <div className="h-8 flex items-center text-sm font-medium">
                    ${(item.quantity * item.priceEach).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2 border-t">
        <div className="text-right">
          <span className="text-sm text-muted-foreground">{t('total')}: </span>
          <span className="text-lg font-bold">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
