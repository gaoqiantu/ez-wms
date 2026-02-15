'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Printer, Search } from 'lucide-react';
import { generateQRDataURL } from '@/lib/qr';
import type { Product } from '@/db/schema';

interface PrintFormProps {
  products: Product[];
}

const labelSizes = [
  { value: 'small', label: '50x30mm', width: 50, height: 30 },
  { value: 'medium', label: '70x40mm', width: 70, height: 40 },
  { value: 'large', label: '100x60mm', width: 100, height: 60 },
];

export function PrintForm({ products }: PrintFormProps) {
  const t = useTranslations('print');
  const tCommon = useTranslations('common');

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [copies, setCopies] = useState(1);
  const [labelSize, setLabelSize] = useState('medium');
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [isPrinting, setIsPrinting] = useState(false);

  const filteredProducts = products.filter(p =>
    p.itemCode.toLowerCase().includes(search.toLowerCase()) ||
    (p.description || '').toLowerCase().includes(search.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const selectAll = () => {
    if (selected.size === filteredProducts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredProducts.map(p => p.id)));
    }
  };

  // Generate QR codes for selected products
  useEffect(() => {
    const generateQRs = async () => {
      const newQrCodes: Record<string, string> = {};
      for (const id of selected) {
        const product = products.find(p => p.id === id);
        if (product && !qrCodes[id]) {
          newQrCodes[id] = await generateQRDataURL(product.itemCode, 150);
        }
      }
      if (Object.keys(newQrCodes).length > 0) {
        setQrCodes(prev => ({ ...prev, ...newQrCodes }));
      }
    };
    generateQRs();
  }, [selected, products, qrCodes]);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const selectedProducts = products.filter(p => selected.has(p.id));
  const size = labelSizes.find(s => s.value === labelSize)!;

  return (
    <div className="space-y-4">
      {/* Selection Controls - Hidden during print */}
      <div className="print:hidden space-y-4">
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
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selected.size === filteredProducts.length ? t('deselectAll') : t('selectAll')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('selected')}: {selected.size}
          </span>
        </div>

        <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border p-2">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 rounded p-2 hover:bg-accent cursor-pointer"
              onClick={() => toggleSelect(product.id)}
            >
              <Checkbox checked={selected.has(product.id)} />
              <div className="flex-1 min-w-0">
                <span className="font-mono text-sm">{product.itemCode}</span>
                <span className="ml-2 text-sm text-muted-foreground truncate">
                  {product.description}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('copies')}</Label>
            <Input
              type="number"
              value={copies}
              onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={10}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('labelSize')}</Label>
            <Select value={labelSize} onValueChange={setLabelSize}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {labelSizes.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={handlePrint}
          disabled={selected.size === 0 || isPrinting}
        >
          <Printer className="mr-2 h-4 w-4" />
          {t('print')} ({selected.size * copies} {t('labels')})
        </Button>
      </div>

      {/* Print Preview / Actual Print Area */}
      <div className="print:block hidden">
        <style jsx global>{`
          @media print {
            @page {
              size: auto;
              margin: 5mm;
            }
            body * {
              visibility: hidden;
            }
            .print-area, .print-area * {
              visibility: visible;
            }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
            }
          }
        `}</style>
      </div>

      <div className="print-area grid gap-2" style={{
        gridTemplateColumns: `repeat(auto-fill, ${size.width}mm)`
      }}>
        {selectedProducts.flatMap((product) =>
          Array.from({ length: copies }, (_, i) => (
            <div
              key={`${product.id}-${i}`}
              className="border rounded p-1 break-inside-avoid"
              style={{
                width: `${size.width}mm`,
                height: `${size.height}mm`,
                fontSize: labelSize === 'small' ? '8px' : labelSize === 'medium' ? '10px' : '12px'
              }}
            >
              <div className="flex h-full gap-1">
                <div className="flex-shrink-0">
                  {qrCodes[product.id] && (
                    <Image
                      src={qrCodes[product.id]}
                      alt={product.itemCode}
                      width={150}
                      height={150}
                      unoptimized
                      style={{
                        width: labelSize === 'small' ? '20mm' : labelSize === 'medium' ? '28mm' : '40mm',
                        height: labelSize === 'small' ? '20mm' : labelSize === 'medium' ? '28mm' : '40mm'
                      }}
                    />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-bold truncate">{product.itemCode}</div>
                  {product.description && <div className="truncate">{product.description}</div>}
                  {product.pcsPerBox && <div>{product.pcsPerBox}pcs/box</div>}
                  <div className="truncate">${product.priceEach.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
