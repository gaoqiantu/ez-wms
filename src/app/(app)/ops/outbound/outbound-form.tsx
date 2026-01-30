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
import { processOutbound } from './actions';
import type { Product, Location, Inventory } from '@/db/schema';
import { calculateTotalPcs } from '@/lib/inventory';

interface OutboundFormProps {
  locations: Location[];
}

export function OutboundForm({ locations }: OutboundFormProps) {
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();
  const [product, setProduct] = useState<Product | null>(null);
  const [currentInventory, setCurrentInventory] = useState<Inventory | null>(null);
  const [boxQty, setBoxQty] = useState(0);
  const [pcsQty, setPcsQty] = useState(0);
  const [location, setLocation] = useState(locations[0]?.code || '');
  const [remark, setRemark] = useState('');

  // Calculate available stock
  const availablePcs = currentInventory && product
    ? calculateTotalPcs(
        currentInventory.boxQty || 0,
        currentInventory.pcsQty || 0,
        product.pcsPerBox || 1
      )
    : 0;

  // Calculate requested total
  const requestedPcs = product
    ? calculateTotalPcs(boxQty, pcsQty, product.pcsPerBox || 1)
    : 0;

  // Check if request exceeds available stock
  const isInsufficientStock = requestedPcs > availablePcs;

  const handleScan = async (value: string) => {
    const found = await searchProduct(value);
    if (found) {
      setProduct(found);
      // Get current inventory at selected location
      if (location) {
        const data = await getProductWithInventory(found.id, location);
        setCurrentInventory(data?.inventory || null);
      }
      // Reset quantities
      setBoxQty(0);
      setPcsQty(0);
    } else {
      toast.error(t('productNotFound'));
    }
  };

  const handleLocationChange = async (newLocation: string) => {
    setLocation(newLocation);
    if (product) {
      const data = await getProductWithInventory(product.id, newLocation);
      setCurrentInventory(data?.inventory || null);
      // Reset quantities when location changes
      setBoxQty(0);
      setPcsQty(0);
    }
  };

  const handleSubmit = () => {
    if (!product || !location) {
      toast.error(t('selectProductAndLocation'));
      return;
    }

    if (boxQty === 0 && pcsQty === 0) {
      toast.error(t('enterQuantity'));
      return;
    }

    if (isInsufficientStock) {
      toast.error(t('insufficientStock'));
      return;
    }

    startTransition(async () => {
      const result = await processOutbound({
        productId: product.id,
        boxQty,
        pcsQty,
        location,
        remark: remark || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tCommon('success'));
        // Reset form
        setProduct(null);
        setCurrentInventory(null);
        setBoxQty(0);
        setPcsQty(0);
        setRemark('');
      }
    });
  };

  const handleReset = () => {
    setProduct(null);
    setCurrentInventory(null);
    setBoxQty(0);
    setPcsQty(0);
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
            showStock={true}
          />

          {/* Stock availability indicator */}
          <div
            className={`rounded-lg border p-3 text-sm ${
              !currentInventory || isInsufficientStock
                ? 'border-destructive bg-destructive/10 text-destructive'
                : 'border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400'
            }`}
          >
            {currentInventory ? (
              <div className="flex items-center justify-between">
                <span>
                  {t('currentStock')}: <strong>{availablePcs}</strong> pcs
                </span>
                {requestedPcs > 0 && (
                  <span className={isInsufficientStock ? 'font-medium' : ''}>
                    {isInsufficientStock ? t('insufficientStock') : `${requestedPcs} pcs`}
                  </span>
                )}
              </div>
            ) : (
              <span>{t('insufficientStock')}</span>
            )}
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <QuantityStepper
              label={t('boxes')}
              value={boxQty}
              onChange={setBoxQty}
            />

            <QuantityStepper
              label={t('pieces')}
              value={pcsQty}
              onChange={setPcsQty}
            />

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
              disabled={isPending || isInsufficientStock || !currentInventory}
            >
              {isPending ? '...' : tCommon('confirm')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
