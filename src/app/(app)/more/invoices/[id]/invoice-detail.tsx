'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteInvoice, completeInvoice } from '../actions';
import type { Invoice, InvoiceItem, Location } from '@/db/schema';

interface InvoiceDetailProps {
  invoice: Invoice & { items: InvoiceItem[] };
  locations?: Location[];
  isDraft?: boolean;
}

export function InvoiceDetail({ invoice, locations, isDraft }: InvoiceDetailProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedLocation, setSelectedLocation] = useState(locations?.[0]?.code || '');

  const handleDelete = () => {
    if (!confirm(t('deleteConfirm'))) return;
    startTransition(async () => {
      const result = await deleteInvoice(invoice.id);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(tCommon('success'));
        router.push('/more/invoices');
      }
    });
  };

  const handleComplete = () => {
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }
    startTransition(async () => {
      const result = await completeInvoice(invoice.id, selectedLocation);
      if ('error' in result) {
        toast.error(result.error);
      } else {
        toast.success(tCommon('success'));
        router.push(`/more/invoices/${invoice.id}/print`);
      }
    });
  };

  const handlePrint = () => {
    router.push(`/more/invoices/${invoice.id}/print`);
  };

  // Draft mode: show action buttons below the form
  if (isDraft) {
    return (
      <div className="space-y-3 pt-4">
        {locations && locations.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Location for deduction</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {locations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.code} {loc.name ? `- ${loc.name}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="h-12"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tCommon('delete')}
          </Button>
          <Button
            className="flex-1 h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            onClick={handleComplete}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('completeAndPrint')}
          </Button>
        </div>
      </div>
    );
  }

  // Completed mode: read-only invoice view
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-mono text-lg font-bold">#{invoice.invoiceNo}</span>
          <Badge className="ml-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
            {t('completed')}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {new Date(invoice.date).toLocaleDateString()}
        </span>
      </div>

      {/* Bill To / Ship To */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">{t('billTo')}</p>
            <p className="font-medium">{invoice.billToName}</p>
            {invoice.billToContact && <p className="text-sm">{invoice.billToContact}</p>}
            {invoice.billToAddress && <p className="text-sm text-muted-foreground">{invoice.billToAddress}</p>}
            {invoice.billToPhone && <p className="text-sm text-muted-foreground">{invoice.billToPhone}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">{t('shipTo')}</p>
            <p className="font-medium">{invoice.shipToName}</p>
            {invoice.shipToContact && <p className="text-sm">{invoice.shipToContact}</p>}
            {invoice.shipToAddress && <p className="text-sm text-muted-foreground">{invoice.shipToAddress}</p>}
            {invoice.shipToPhone && <p className="text-sm text-muted-foreground">{invoice.shipToPhone}</p>}
          </CardContent>
        </Card>
      </div>

      {/* Header Fields */}
      {(invoice.poNumber || invoice.terms || invoice.rep || invoice.via || invoice.ship) && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          {invoice.poNumber && <div><span className="text-muted-foreground">{t('poNumber')}: </span>{invoice.poNumber}</div>}
          {invoice.terms && <div><span className="text-muted-foreground">{t('terms')}: </span>{invoice.terms}</div>}
          {invoice.rep && <div><span className="text-muted-foreground">{t('rep')}: </span>{invoice.rep}</div>}
          {invoice.via && <div><span className="text-muted-foreground">{t('via')}: </span>{invoice.via}</div>}
          {invoice.ship && <div><span className="text-muted-foreground">{t('ship')}: </span>{invoice.ship}</div>}
        </div>
      )}

      {/* Line Items */}
      <div className="rounded-lg border">
        <div className="grid grid-cols-12 gap-1 border-b bg-muted p-2 text-xs font-semibold">
          <div className="col-span-2">{t('quantity')}</div>
          <div className="col-span-3">{t('itemCode')}</div>
          <div className="col-span-3">{t('description')}</div>
          <div className="col-span-2">{t('priceEach')}</div>
          <div className="col-span-2 text-right">{t('amount')}</div>
        </div>
        {invoice.items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-1 border-b p-2 text-sm last:border-0">
            <div className="col-span-2">{item.quantity}</div>
            <div className="col-span-3 font-mono text-xs">{item.itemCode}</div>
            <div className="col-span-3 truncate">{item.description}</div>
            <div className="col-span-2">${item.priceEach.toFixed(2)}</div>
            <div className="col-span-2 text-right font-medium">${item.amount.toFixed(2)}</div>
          </div>
        ))}
        <div className="flex justify-end border-t p-2">
          <span className="text-sm text-muted-foreground mr-2">{t('total')}:</span>
          <span className="font-bold">${(invoice.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {invoice.remark && (
        <div className="text-sm">
          <span className="text-muted-foreground">{t('remark')}: </span>{invoice.remark}
        </div>
      )}

      {/* Print Button */}
      <Button
        className="w-full h-12 text-base"
        onClick={handlePrint}
      >
        <Printer className="mr-2 h-4 w-4" />
        {t('print')}
      </Button>
    </div>
  );
}
