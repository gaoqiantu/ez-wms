'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Search, X, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QrScannerProps {
  onScan: (value: string) => void;
  placeholder?: string;
}

export function QrScanner({ onScan, placeholder }: QrScannerProps) {
  const t = useTranslations('ops');
  const [isScanning, setIsScanning] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop();
      }
    };
  }, []);

  const startScanner = async () => {
    setError(null);
    setIsScanning(true);

    // Create scanner instance
    scannerRef.current = new Html5Qrcode('qr-reader');

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanner();
        },
        () => {} // Ignore QR not found frames
      );
    } catch (err) {
      console.error('Scanner error:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Provide user-friendly error messages
      if (errorMessage.includes('Permission') || errorMessage.includes('denied')) {
        setError(t('cameraPermissionDenied'));
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('Requested device not found')) {
        setError(t('noCameraFound'));
      } else if (errorMessage.includes('NotAllowedError')) {
        setError(t('cameraPermissionDenied'));
      } else if (errorMessage.includes('NotReadableError')) {
        setError(t('cameraInUse'));
      } else {
        setError(t('cameraError'));
      }
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setIsScanning(false);
    setError(null);
  };

  const handleSearch = () => {
    if (searchValue.trim()) {
      onScan(searchValue.trim());
      setSearchValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('scanOrSearch')}
          className="flex-1"
        />
        <Button variant="outline" size="icon" onClick={handleSearch}>
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant={isScanning ? 'destructive' : 'outline'}
          size="icon"
          onClick={isScanning ? stopScanner : startScanner}
        >
          {isScanning ? <X className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {isScanning && (
        <div
          id="qr-reader"
          className="mx-auto w-full max-w-sm overflow-hidden rounded-lg"
        />
      )}
    </div>
  );
}
