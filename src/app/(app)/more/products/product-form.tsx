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
    sku: product?.sku || '',
    name: product?.name || '',
    brand: product?.brand || '',
    series: product?.series || '',
    spec: product?.spec || '',
    color: product?.color || '',
    unit: product?.unit || 'Pcs',
    pcsPerBox: product?.pcsPerBox || 1,
    areaPerPcs: product?.areaPerPcs || 0,
  });

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sku || !formData.name) {
      toast.error('SKU and Name are required');
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
        <Label htmlFor="sku">{t('sku')} *</Label>
        <Input
          id="sku"
          value={formData.sku}
          onChange={(e) => handleChange('sku', e.target.value)}
          placeholder="SKU-0001"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t('name')} *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleChange('name', e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">{t('brand')}</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => handleChange('brand', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="series">{t('series')}</Label>
          <Input
            id="series"
            value={formData.series}
            onChange={(e) => handleChange('series', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="spec">{t('spec')}</Label>
          <Input
            id="spec"
            value={formData.spec}
            onChange={(e) => handleChange('spec', e.target.value)}
            placeholder="800x800"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="color">{t('color')}</Label>
          <Input
            id="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="areaPerPcs">{t('areaPerPcs')}</Label>
          <Input
            id="areaPerPcs"
            type="number"
            step="0.01"
            value={formData.areaPerPcs}
            onChange={(e) => handleChange('areaPerPcs', parseFloat(e.target.value) || 0)}
            min={0}
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
