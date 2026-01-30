'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { QrScanner } from '@/components/scanner/qr-scanner';
import { ProductCard } from '@/components/product/product-card';
import { QuantityStepper } from '@/components/form/quantity-stepper';
import { LocationSelect } from '@/components/form/location-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { searchProduct, getProductWithInventory } from '../actions';
import { processStocktake } from './actions';
import type { Product, Location, Inventory } from '@/db/schema';

interface StocktakeFormProps {
  locations: Location[];
}

export function StocktakeForm({ locations }: StocktakeFormProps) {
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();
  const [product, setProduct] = useState<Product | null>(null);
  const [currentInventory, setCurrentInventory] = useState<Inventory | null>(null);
  const [actualBoxQty, setActualBoxQty] = useState(0);
  const [actualPcsQty, setActualPcsQty] = useState(0);
  const [location, setLocation] = useState(locations[0]?.code || '');
  const [remark, setRemark] = useState('');

  // Calculate system stock and variance
  const systemBoxes = currentInventory?.boxQty || 0;
  const systemPcs = currentInventory?.pcsQty || 0;
  const boxVariance = actualBoxQty - systemBoxes;
  const pcsVariance = actualPcsQty - systemPcs;

  const formatVariance = (value: number) => {
    if (value === 0) return '0';
    return value > 0 ? `+${value}` : `${value}`;
  };

  const handleScan = async (value: string) => {
    const found = await searchProduct(value);
    if (found) {
      setProduct(found);
      // Get current inventory at selected location
      if (location) {
        const data = await getProductWithInventory(found.id, location);
        setCurrentInventory(data?.inventory || null);
        // Pre-fill actual with system stock
        setActualBoxQty(data?.inventory?.boxQty || 0);
        setActualPcsQty(data?.inventory?.pcsQty || 0);
      }
    } else {
      toast.error(t('productNotFound'));
    }
  };

  const handleLocationChange = async (newLocation: string) => {
    setLocation(newLocation);
    if (product) {
      const data = await getProductWithInventory(product.id, newLocation);
      setCurrentInventory(data?.inventory || null);
      // Pre-fill actual with system stock
      setActualBoxQty(data?.inventory?.boxQty || 0);
      setActualPcsQty(data?.inventory?.pcsQty || 0);
    }
  };

  const handleSubmit = () => {
    if (!product || !location) {
      toast.error(t('selectProductAndLocation'));
      return;
    }

    startTransition(async () => {
      const result = await processStocktake({
        productId: product.id,
        location,
        actualBoxQty,
        actualPcsQty,
        remark: remark || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else if (result.message) {
        toast.info(t('noAdjustment'));
        handleReset();
      } else {
        toast.success(tCommon('success'));
        handleReset();
      }
    });
  };

  const handleReset = () => {
    setProduct(null);
    setCurrentInventory(null);
    setActualBoxQty(0);
    setActualPcsQty(0);
    setRemark('');
  };

  return (
    <div className="space-y-4">
      <QrScanner onScan={handleScan} />

      {product && (
        <>
          <ProductCard
            product={product}
            inventory={currentInventory}
            showStock={false}
          />

          <div className="space-y-4 rounded-lg border p-4">
            {/* System Stock Display */}
            <div className="rounded-md bg-muted p-3">
              <Label className="text-sm font-medium text-muted-foreground">{t('systemStock')}</Label>
              <div className="mt-1 flex gap-4 text-lg font-semibold">
                <span>{systemBoxes} {t('boxes')}</span>
                <span>{systemPcs} {t('pieces')}</span>
              </div>
            </div>

            {/* Actual Count Inputs */}
            <div>
              <Label className="text-sm font-medium">{t('actualCount')}</Label>
              <div className="mt-2 space-y-3">
                <QuantityStepper
                  label={t('boxes')}
                  value={actualBoxQty}
                  onChange={setActualBoxQty}
                  min={0}
                />

                <QuantityStepper
                  label={t('pieces')}
                  value={actualPcsQty}
                  onChange={setActualPcsQty}
                  min={0}
                />
              </div>
            </div>

            {/* Variance Display */}
            <div className="rounded-md border p-3">
              <Label className="text-sm font-medium">{t('variance')}</Label>
              <div className="mt-1 flex gap-4 text-lg font-semibold">
                <span className={boxVariance !== 0 ? (boxVariance > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                  {formatVariance(boxVariance)} {t('boxes')}
                </span>
                <span className={pcsVariance !== 0 ? (pcsVariance > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                  {formatVariance(pcsVariance)} {t('pieces')}
                </span>
              </div>
            </div>

            <LocationSelect
              label={t('location')}
              locations={locations}
              value={location}
              onChange={handleLocationChange}
            />

            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('remark')}</Label>
              <Input
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={t('remark')}
                className="w-40"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleReset}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? '...' : tCommon('confirm')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
