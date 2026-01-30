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
import { Loader2 } from 'lucide-react';
import { searchProduct, getInventoryByProduct } from '../actions';
import { processTransfer } from './actions';
import type { Product, Location, Inventory } from '@/db/schema';

interface TransferFormProps {
  locations: Location[];
}

export function TransferForm({ locations }: TransferFormProps) {
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();
  const [product, setProduct] = useState<Product | null>(null);
  const [inventoryList, setInventoryList] = useState<Inventory[]>([]);
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [boxQty, setBoxQty] = useState(0);
  const [pcsQty, setPcsQty] = useState(0);
  const [remark, setRemark] = useState('');

  // Get inventory at selected source location
  const sourceInventory = inventoryList.find((inv) => inv.location === fromLocation);

  const handleScan = async (value: string) => {
    const found = await searchProduct(value);
    if (found) {
      setProduct(found);
      // Get all inventory locations for this product
      const inventory = await getInventoryByProduct(found.id);
      setInventoryList(inventory);

      // Auto-select first location with stock as source
      if (inventory.length > 0) {
        setFromLocation(inventory[0].location);
        // Default to all stock at source
        setBoxQty(inventory[0].boxQty || 0);
        setPcsQty(inventory[0].pcsQty || 0);
      }
    } else {
      toast.error(t('productNotFound'));
    }
  };

  const handleFromLocationChange = (newLocation: string) => {
    setFromLocation(newLocation);
    // Update quantities to match source stock
    const inv = inventoryList.find((i) => i.location === newLocation);
    if (inv) {
      setBoxQty(inv.boxQty || 0);
      setPcsQty(inv.pcsQty || 0);
    }
  };

  const handleSubmit = () => {
    if (!product || !fromLocation || !toLocation) {
      toast.error(t('selectProductAndLocation'));
      return;
    }

    if (fromLocation === toLocation) {
      toast.error(t('sameLocationError'));
      return;
    }

    if (boxQty === 0 && pcsQty === 0) {
      toast.error(t('enterQuantity'));
      return;
    }

    startTransition(async () => {
      const result = await processTransfer({
        productId: product.id,
        fromLocation,
        toLocation,
        boxQty,
        pcsQty,
        remark: remark || undefined,
      });

      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(tCommon('success'));
        // Reset form
        setProduct(null);
        setInventoryList([]);
        setFromLocation('');
        setToLocation('');
        setBoxQty(0);
        setPcsQty(0);
        setRemark('');
      }
    });
  };

  const handleReset = () => {
    setProduct(null);
    setInventoryList([]);
    setFromLocation('');
    setToLocation('');
    setBoxQty(0);
    setPcsQty(0);
    setRemark('');
  };

  // Filter locations that have inventory for source selection
  const sourceLocations = locations.filter((loc) =>
    inventoryList.some((inv) => inv.location === loc.code)
  );

  return (
    <div className="space-y-4">
      <QrScanner onScan={handleScan} />

      {product && (
        <>
          <ProductCard
            product={product}
            inventory={sourceInventory || null}
            showStock={true}
          />

          {/* Inventory at all locations */}
          {inventoryList.length > 0 && (
            <div className="rounded-lg border p-4">
              <Label className="text-sm font-medium">{t('currentStock')}</Label>
              <div className="mt-2 space-y-2">
                {inventoryList.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-muted-foreground">{inv.location}</span>
                    <span>
                      {inv.boxQty || 0} {t('boxes')} / {inv.pcsQty || 0} {t('pieces')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 rounded-lg border p-4">
            {/* Source location - only show locations with stock */}
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">{t('fromLocation')}</Label>
              <select
                value={fromLocation}
                onChange={(e) => handleFromLocationChange(e.target.value)}
                className="w-40 rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {sourceLocations.map((loc) => (
                  <option key={loc.id} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Destination location - all locations */}
            <LocationSelect
              label={t('toLocation')}
              locations={locations}
              value={toLocation}
              onChange={setToLocation}
            />

            <QuantityStepper
              label={t('boxes')}
              value={boxQty}
              onChange={setBoxQty}
              max={sourceInventory?.boxQty || 0}
            />

            <QuantityStepper
              label={t('pieces')}
              value={pcsQty}
              onChange={setPcsQty}
              max={sourceInventory?.pcsQty || 0}
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

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 text-base active:scale-[0.98] transition-transform"
              onClick={handleReset}
            >
              {tCommon('cancel')}
            </Button>
            <Button
              className="flex-1 h-12 text-base bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-transform"
              onClick={handleSubmit}
              disabled={isPending || fromLocation === toLocation}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {tCommon('confirm')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
