'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Package, History, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { exportToExcel } from '@/lib/excel';
import { getInventoryForExport, getTransactionsForExport, getProductsForExport } from './actions';

export function ExportForm() {
  const t = useTranslations('export');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleExportInventory = () => {
    startTransition(async () => {
      try {
        const data = await getInventoryForExport();
        exportToExcel({
          filename: `inventory_${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Inventory',
          headers: [
            { key: 'sku', label: 'SKU / 货号' },
            { key: 'name', label: 'Name / 名称' },
            { key: 'brand', label: 'Brand / 品牌' },
            { key: 'spec', label: 'Spec / 规格' },
            { key: 'color', label: 'Color / 颜色' },
            { key: 'location', label: 'Location / 库位' },
            { key: 'boxQty', label: 'Boxes / 整箱' },
            { key: 'pcsQty', label: 'Pieces / 散片' },
            { key: 'totalPcs', label: 'Total Pcs / 总片数' },
            { key: 'totalArea', label: 'Total Area (m2) / 总面积' },
          ],
          data,
        });
        toast.success(tCommon('success'));
      } catch (error) {
        console.error('Export error:', error);
        toast.error(tCommon('error'));
      }
    });
  };

  const handleExportTransactions = () => {
    startTransition(async () => {
      try {
        const data = await getTransactionsForExport(fromDate || undefined, toDate || undefined);
        exportToExcel({
          filename: `transactions_${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Transactions',
          headers: [
            { key: 'createdAt', label: 'Date / 日期' },
            { key: 'type', label: 'Type / 类型' },
            { key: 'sku', label: 'SKU / 货号' },
            { key: 'productName', label: 'Product / 产品' },
            { key: 'boxQty', label: 'Boxes / 箱数' },
            { key: 'pcsQty', label: 'Pieces / 片数' },
            { key: 'fromLocation', label: 'From / 原库位' },
            { key: 'toLocation', label: 'To / 目标库位' },
            { key: 'operatorName', label: 'Operator / 操作员' },
            { key: 'remark', label: 'Remark / 备注' },
          ],
          data,
        });
        toast.success(tCommon('success'));
      } catch (error) {
        console.error('Export error:', error);
        toast.error(tCommon('error'));
      }
    });
  };

  const handleExportProducts = () => {
    startTransition(async () => {
      try {
        const data = await getProductsForExport();
        exportToExcel({
          filename: `products_${new Date().toISOString().split('T')[0]}`,
          sheetName: 'Products',
          headers: [
            { key: 'sku', label: 'SKU / 货号' },
            { key: 'name', label: 'Name / 名称' },
            { key: 'brand', label: 'Brand / 品牌' },
            { key: 'series', label: 'Series / 系列' },
            { key: 'spec', label: 'Spec / 规格' },
            { key: 'color', label: 'Color / 颜色' },
            { key: 'unit', label: 'Unit / 单位' },
            { key: 'pcsPerBox', label: 'Pcs/Box / 片/箱' },
            { key: 'areaPerPcs', label: 'Area/Pc / 单片面积' },
          ],
          data,
        });
        toast.success(tCommon('success'));
      } catch (error) {
        console.error('Export error:', error);
        toast.error(tCommon('error'));
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <ClipboardList className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('inventoryExport')}</CardTitle>
              <CardDescription>{t('inventoryExportDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportInventory} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            {t('download')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <History className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('transactionsExport')}</CardTitle>
              <CardDescription>{t('transactionsExportDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('fromDate')}</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('toDate')}</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleExportTransactions} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            {t('download')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">{t('productsExport')}</CardTitle>
              <CardDescription>{t('productsExportDesc')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button onClick={handleExportProducts} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            {t('download')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
