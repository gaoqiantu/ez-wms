'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/form/combobox';
import { CustomerSelect } from './customer-select';
import { LineItems, generateItemKey } from './line-items';
import type { LineItem } from './line-items';
import { createInvoice, updateInvoice } from './actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import type { Invoice, InvoiceItem } from '@/db/schema';

interface InvoiceFormProps {
  invoice?: Invoice & { items: InvoiceItem[] };
  nextInvoiceNo: number;
  termsOptions: string[];
  repOptions: string[];
  viaOptions: string[];
  shipOptions: string[];
}

interface CustomerFormValue {
  customerId?: string;
  name: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
}

const normalize = (value?: string | null) => (value || '').trim();

export function InvoiceForm({
  invoice,
  nextInvoiceNo,
  termsOptions,
  repOptions,
  viaOptions,
  shipOptions,
}: InvoiceFormProps) {
  const t = useTranslations('invoices');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(
    invoice ? new Date(invoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [poNumber, setPoNumber] = useState(invoice?.poNumber || '');
  const [billTo, setBillTo] = useState<CustomerFormValue>({
    customerId: invoice?.billToCustomerId || undefined,
    name: invoice?.billToName || '',
    contactName: invoice?.billToContact || '',
    address: invoice?.billToAddress || '',
    phone: invoice?.billToPhone || '',
    email: invoice?.billToEmail || '',
  });
  const [shipTo, setShipTo] = useState<CustomerFormValue>({
    customerId: invoice?.shipToCustomerId || undefined,
    name: invoice?.shipToName || '',
    contactName: invoice?.shipToContact || '',
    address: invoice?.shipToAddress || '',
    phone: invoice?.shipToPhone || '',
    email: invoice?.shipToEmail || '',
  });
  const [shipToCustomized, setShipToCustomized] = useState(() => {
    if (!invoice) return false;
    return (
      normalize(invoice.shipToCustomerId) !== normalize(invoice.billToCustomerId) ||
      normalize(invoice.shipToName) !== normalize(invoice.billToName) ||
      normalize(invoice.shipToContact) !== normalize(invoice.billToContact) ||
      normalize(invoice.shipToAddress) !== normalize(invoice.billToAddress) ||
      normalize(invoice.shipToPhone) !== normalize(invoice.billToPhone) ||
      normalize(invoice.shipToEmail) !== normalize(invoice.billToEmail)
    );
  });
  const [terms, setTerms] = useState(invoice?.terms || '');
  const [rep, setRep] = useState(invoice?.rep || '');
  const [via, setVia] = useState(invoice?.via || '');
  const [ship, setShip] = useState(invoice?.ship || '');
  const [items, setItems] = useState<LineItem[]>(() =>
    invoice?.items?.map(item => ({
      _key: generateItemKey(),
      productId: item.productId || undefined,
      itemCode: item.itemCode,
      description: item.description || '',
      priceEach: item.priceEach,
      quantity: item.quantity,
    })) ?? []
  );
  const [remark, setRemark] = useState(invoice?.remark || '');

  const handleSubmit = () => {
    // Validate billTo name
    if (!billTo.name.trim()) {
      toast.error(t('billToRequired'));
      return;
    }

    if (items.length === 0) {
      toast.error(t('addAtLeastOneItem'));
      return;
    }

    // Validate all items have quantity >= 1
    if (items.some(item => item.quantity < 1)) {
      toast.error(t('quantityRequired'));
      return;
    }

    startTransition(async () => {
      try {
        // Strip _key before sending to server
        const serverItems = items.map((item) => ({
          productId: item.productId,
          itemCode: item.itemCode,
          description: item.description,
          priceEach: item.priceEach,
          quantity: item.quantity,
        }));

        const data = {
          date,
          poNumber: poNumber || undefined,
          billTo,
          shipTo,
          terms: terms || undefined,
          rep: rep || undefined,
          via: via || undefined,
          ship: ship || undefined,
          items: serverItems,
          remark: remark || undefined,
        };

        if (invoice) {
          const result = await updateInvoice(invoice.id, data);
          if ('error' in result) {
            toast.error(result.error);
            return;
          }
          toast.success(tCommon('success'));
        } else {
          const result = await createInvoice(data);
          if ('error' in result) {
            toast.error(result.error);
            return;
          }
          toast.success(tCommon('success'));
          router.push(`/more/invoices/${result.id}`);
        }
      } catch {
        toast.error(tCommon('error'));
      }
    });
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header: Date + Invoice # */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-xs">{t('date')}</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('invoiceNo')}</Label>
          <div className="flex h-9 items-center rounded-md border px-3 text-sm font-mono font-semibold bg-muted">
            {invoice ? invoice.invoiceNo : nextInvoiceNo}
          </div>
        </div>
      </div>

      {/* P.O. Number */}
      <div className="space-y-1">
        <Label className="text-xs">{t('poNumber')}</Label>
        <Input
          value={poNumber}
          onChange={(e) => setPoNumber(e.target.value)}
        />
      </div>

      {/* Bill To */}
      <CustomerSelect
        label={t('billTo')}
        addressType="billTo"
        value={billTo}
        onChange={(nextBillTo, meta) => {
          setBillTo(nextBillTo);

          if (shipToCustomized) return;

          if (meta.source === 'select' && meta.customer) {
            setShipTo({
              customerId: meta.customer.id,
              name: meta.customer.name,
              contactName: meta.customer.contactName || '',
              address: meta.customer.shipToAddress || meta.customer.address || meta.customer.billToAddress || '',
              phone: meta.customer.phone || '',
              email: meta.customer.email || '',
            });
            return;
          }

          setShipTo({
            customerId: nextBillTo.customerId,
            name: nextBillTo.name,
            contactName: nextBillTo.contactName,
            address: nextBillTo.address,
            phone: nextBillTo.phone,
            email: nextBillTo.email,
          });
        }}
      />

      {/* Ship To */}
      <CustomerSelect
        label={t('shipTo')}
        addressType="shipTo"
        value={shipTo}
        onChange={(nextShipTo) => {
          setShipTo(nextShipTo);
          setShipToCustomized(true);
        }}
      />

      {/* Terms / Rep / Via / Ship */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">{t('terms')}</Label>
          <Combobox value={terms} onChange={setTerms} options={termsOptions} placeholder="e.g. COD" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('rep')}</Label>
          <Combobox value={rep} onChange={setRep} options={repOptions} placeholder="Rep" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('via')}</Label>
          <Combobox value={via} onChange={setVia} options={viaOptions} placeholder="Via" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t('ship')}</Label>
          <Combobox value={ship} onChange={setShip} options={shipOptions} placeholder="Ship" />
        </div>
      </div>

      {/* Line Items */}
      <LineItems items={items} onChange={setItems} />

      {/* Remark */}
      <div className="space-y-1">
        <Label className="text-xs">{t('remark')}</Label>
        <Input
          value={remark}
          onChange={(e) => setRemark(e.target.value)}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          className="flex-1 h-12 text-base"
          onClick={handleSubmit}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t('saveDraft')}
        </Button>
      </div>
    </div>
  );
}
