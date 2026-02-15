'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createCustomer, updateCustomer, deleteCustomer } from './actions';
import type { Customer } from '@/db/schema';

interface CustomerFormProps {
  customer?: Customer;
}

export function CustomerForm({ customer }: CustomerFormProps) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    contactName: customer?.contactName || '',
    billToAddress: customer?.billToAddress || customer?.address || '',
    shipToAddress: customer?.shipToAddress || customer?.address || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error(t('name') + ' is required');
      return;
    }

    startTransition(async () => {
      try {
        if (customer) {
          await updateCustomer(customer.id, formData);
          toast.success(tCommon('success'));
        } else {
          const result = await createCustomer(formData);
          if ('error' in result) {
            toast.error(result.error);
            return;
          }
          toast.success(tCommon('success'));
          router.push(`/more/customers/${result.id}`);
        }
      } catch {
        toast.error(tCommon('error'));
      }
    });
  };

  const handleDelete = () => {
    if (!customer) return;
    if (!confirm(t('deleteConfirm'))) return;

    startTransition(async () => {
      await deleteCustomer(customer.id);
      toast.success(tCommon('success'));
      router.push('/more/customers');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="contactName">{t('contactName')}</Label>
        <Input
          id="contactName"
          value={formData.contactName}
          onChange={(e) => handleChange('contactName', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="billToAddress">{t('billToAddress')}</Label>
        <Input
          id="billToAddress"
          value={formData.billToAddress}
          onChange={(e) => handleChange('billToAddress', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="shipToAddress">{t('shipToAddress')}</Label>
        <Input
          id="shipToAddress"
          value={formData.shipToAddress}
          onChange={(e) => handleChange('shipToAddress', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">{t('phone')}</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        {customer && (
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending}>
            {t('delete')}
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? '...' : tCommon('save')}
        </Button>
      </div>
    </form>
  );
}
