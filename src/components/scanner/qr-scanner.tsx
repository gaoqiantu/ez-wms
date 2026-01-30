'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Search, X, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface QrScannerProps {
  onScan: (value: string) => void;
  placeholder?: string;
}

export function QrScanner({ onScan, placeholder }: QrScannerProps) {
  const t = useTranslations('ops');
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
    setIsScanning(false);
    setIsStarting(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Start scanner when container is ready
  useEffect(() => {
    if (!isStarting || !containerRef.current) return;

    const startCamera = async () => {
      try {
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!containerRef.current) {
          throw new Error('Container not ready');
        }

        scannerRef.current = new Html5Qrcode('qr-reader');

        await scannerRef.current.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScan(decodedText);
            stopScanner();
          },
          () => {} // Ignore QR not found frames
        );

        setIsScanning(true);
        setIsStarting(false);
      } catch (err) {
        console.error('Scanner error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);

        // Provide user-friendly error messages
        if (errorMessage.includes('Permission') || errorMessage.includes('denied') || errorMessage.includes('NotAllowedError')) {
          setError(t('cameraPermissionDenied'));
        } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('Requested device not found') || errorMessage.includes('no camera')) {
          setError(t('noCameraFound'));
        } else if (errorMessage.includes('NotReadableError') || errorMessage.includes('Could not start')) {
          setError(t('cameraInUse'));
        } else {
          setError(t('cameraError') + ': ' + errorMessage);
        }
        setIsStarting(false);
        setIsScanning(false);
      }
    };

    startCamera();
  }, [isStarting, onScan, stopScanner, t]);

  const handleStartClick = () => {
    setError(null);
    setIsStarting(true);
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

  const showScanner = isStarting || isScanning;

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
          variant={showScanner ? 'destructive' : 'outline'}
          size="icon"
          onClick={showScanner ? stopScanner : handleStartClick}
          disabled={isStarting}
        >
          {isStarting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : showScanner ? (
            <X className="h-4 w-4" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showScanner && (
        <div
          id="qr-reader"
          ref={containerRef}
          className="mx-auto w-full max-w-sm overflow-hidden rounded-lg bg-black"
          style={{ minHeight: '300px' }}
        />
      )}
    </div>
  );
}
