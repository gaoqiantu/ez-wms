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
import { processInbound } from './actions';
import type { Product, Location, Inventory } from '@/db/schema';

interface InboundFormProps {
  locations: Location[];
}

export function InboundForm({ locations }: InboundFormProps) {
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();
  const [product, setProduct] = useState<Product | null>(null);
  const [currentInventory, setCurrentInventory] = useState<Inventory | null>(null);
  const [boxQty, setBoxQty] = useState(1);
  const [pcsQty, setPcsQty] = useState(0);
  const [location, setLocation] = useState(locations[0]?.code || '');
  const [remark, setRemark] = useState('');

  const handleScan = async (value: string) => {
    const found = await searchProduct(value);
    if (found) {
      setProduct(found);
      // Get current inventory at selected location
      if (location) {
        const data = await getProductWithInventory(found.id, location);
        setCurrentInventory(data?.inventory || null);
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

    startTransition(async () => {
      const result = await processInbound({
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
        setBoxQty(1);
        setPcsQty(0);
        setRemark('');
      }
    });
  };

  const handleReset = () => {
    setProduct(null);
    setCurrentInventory(null);
    setBoxQty(1);
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
