'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createProduct, updateProduct, deleteProduct } from './actions';
import type { Product } from '@/db/schema';

interface ProductFormProps {
  product?: Product;
}

export function ProductForm({ product }: ProductFormProps) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [formData, setFormData] = useState({
    itemCode: product?.itemCode || '',
    description: product?.description || '',
    priceEach: product?.priceEach || 0,
    unit: product?.unit || 'Pcs',
    pcsPerBox: product?.pcsPerBox || 1,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.itemCode) {
      toast.error('Item Code is required');
      return;
    }

    startTransition(async () => {
      try {
        if (product) {
          await updateProduct(product.id, formData);
          toast.success(tCommon('success'));
        } else {
          const result = await createProduct(formData);
          toast.success(tCommon('success'));
          router.push(`/more/products/${result.id}`);
        }
      } catch (error) {
        toast.error(tCommon('error'));
      }
    });
  };

  const handleDelete = () => {
    if (!product) return;
    if (!confirm(t('deleteConfirm'))) return;

    startTransition(async () => {
      await deleteProduct(product.id);
      toast.success(tCommon('success'));
      router.push('/more/products');
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="itemCode">{t('itemCode')} *</Label>
        <Input
          id="itemCode"
          value={formData.itemCode}
          onChange={(e) => handleChange('itemCode', e.target.value)}
          placeholder="ITEM-0001"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('description')}</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priceEach">{t('priceEach')}</Label>
          <Input
            id="priceEach"
            type="number"
            step="0.01"
            value={formData.priceEach}
            onChange={(e) => handleChange('priceEach', parseFloat(e.target.value) || 0)}
            min={0}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unit">{t('unit')}</Label>
          <Input
            id="unit"
            value={formData.unit}
            onChange={(e) => handleChange('unit', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pcsPerBox">{t('pcsPerBox')}</Label>
          <Input
            id="pcsPerBox"
            type="number"
            value={formData.pcsPerBox}
            onChange={(e) => handleChange('pcsPerBox', parseInt(e.target.value) || 1)}
            min={1}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        {product && (
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
