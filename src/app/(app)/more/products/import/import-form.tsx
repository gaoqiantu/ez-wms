'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { parseCSV, generateCSV } from '@/lib/csv';
import { importProducts, importInventory } from './actions';

type ImportType = 'products' | 'inventory';
type ImportMode = 'add' | 'update' | 'upsert';

const productsTemplate = {
  headers: ['sku', 'name', 'brand', 'series', 'spec', 'color', 'unit', 'pcs_per_box', 'area_per_pcs'],
  rows: [
    { sku: 'SKU-0001', name: 'Italian Carrara Marble', brand: 'MarbleCo', series: 'Premium', spec: '800x800', color: 'White', unit: 'Pcs', pcs_per_box: '6', area_per_pcs: '0.64' },
    { sku: 'SKU-0002', name: 'Grey Granite Tile', brand: 'StoneTech', series: 'Standard', spec: '600x600', color: 'Dark Grey', unit: 'Pcs', pcs_per_box: '8', area_per_pcs: '0.36' },
  ],
};

const inventoryTemplate = {
  headers: ['sku', 'location', 'box_qty', 'pcs_qty'],
  rows: [
    { sku: 'SKU-0001', location: 'A-01', box_qty: '10', pcs_qty: '2' },
    { sku: 'SKU-0001', location: 'A-02', box_qty: '5', pcs_qty: '0' },
    { sku: 'SKU-0002', location: 'B-01', box_qty: '8', pcs_qty: '4' },
  ],
};

export function ImportForm() {
  const t = useTranslations('import');
  const tCommon = useTranslations('common');

  const [isPending, startTransition] = useTransition();
  const [importType, setImportType] = useState<ImportType>('products');
  const [importMode, setImportMode] = useState<ImportMode>('upsert');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [result, setResult] = useState<{ added: number; updated: number; skipped: number; errors: string[] } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResult(null);

    const text = await selectedFile.text();
    const parsed = parseCSV(text);
    setPreview(parsed);
  };

  const handleDownloadTemplate = () => {
    const template = importType === 'products' ? productsTemplate : inventoryTemplate;
    const csv = generateCSV(template.headers, template.rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${importType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (!preview) return;

    startTransition(async () => {
      try {
        let results;
        if (importType === 'products') {
          results = await importProducts(preview.rows as unknown as Parameters<typeof importProducts>[0], importMode);
        } else {
          results = await importInventory(preview.rows as unknown as Parameters<typeof importInventory>[0]);
        }
        setResult(results);
        if (results.errors.length === 0) {
          toast.success(tCommon('success'));
        }
      } catch {
        toast.error(tCommon('error'));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('importType')}</Label>
          <Select value={importType} onValueChange={(v) => { setImportType(v as ImportType); setPreview(null); setFile(null); setResult(null); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="products">{t('products')}</SelectItem>
              <SelectItem value="inventory">{t('inventory')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {importType === 'products' && (
          <div className="space-y-2">
            <Label>{t('importMode')}</Label>
            <Select value={importMode} onValueChange={(v) => setImportMode(v as ImportMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="add">{t('modeAdd')}</SelectItem>
                <SelectItem value="update">{t('modeUpdate')}</SelectItem>
                <SelectItem value="upsert">{t('modeUpsert')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <Button variant="outline" onClick={handleDownloadTemplate}>
        <Download className="mr-2 h-4 w-4" />
        {t('downloadTemplate')}
      </Button>

      <Card>
        <CardContent className="p-4">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center hover:bg-accent">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {file ? file.name : t('dropFile')}
            </span>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t('preview')} ({preview.rows.length} {t('rows')})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-40 overflow-auto text-xs">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {preview.headers.map((h) => (
                      <th key={h} className="p-1 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="border-b">
                      {preview.headers.map((h) => (
                        <td key={h} className="p-1 truncate max-w-20">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {preview.rows.length > 5 && (
                <p className="mt-2 text-muted-foreground">...{t('andMore', { count: preview.rows.length - 5 })}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className={result.errors.length > 0 ? 'border-yellow-500' : 'border-green-500'}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {result.errors.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              )}
              <div className="space-y-1 text-sm">
                <p>{t('added')}: {result.added}</p>
                <p>{t('updated')}: {result.updated}</p>
                <p>{t('skipped')}: {result.skipped}</p>
                {result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium text-yellow-600">{t('errors')}:</p>
                    <ul className="list-disc pl-4 text-xs">
                      {result.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full"
        onClick={handleImport}
        disabled={!preview || isPending}
      >
        <FileText className="mr-2 h-4 w-4" />
        {isPending ? '...' : t('import')}
      </Button>
    </div>
  );
}
