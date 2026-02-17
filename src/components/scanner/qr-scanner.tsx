'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Search, X, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { searchProductsForPicker } from './actions';
import type { Product } from '@/db/schema';

interface QrScannerProps {
  onScan: (value: string) => void;
  placeholder?: string;
}

export function QrScanner({ onScan, placeholder }: QrScannerProps) {
  const t = useTranslations('ops');
  const tCommon = useTranslations('common');
  const [isScanning, setIsScanning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchRequestRef = useRef(0);

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

  useEffect(() => {
    if (!showResults) return;

    const timer = setTimeout(async () => {
      const requestId = ++searchRequestRef.current;
      setIsSearchLoading(true);
      try {
        const results = await searchProductsForPicker(searchValue);
        if (requestId === searchRequestRef.current) {
          setSearchResults(results);
        }
      } catch (err) {
        console.error('Product search error:', err);
        if (requestId === searchRequestRef.current) {
          setSearchResults([]);
        }
      } finally {
        if (requestId === searchRequestRef.current) {
          setIsSearchLoading(false);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchValue, showResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartClick = () => {
    setError(null);
    setIsStarting(true);
  };

  const handleSearch = () => {
    if (searchValue.trim()) {
      onScan(searchValue.trim());
      setSearchValue('');
      setShowResults(false);
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
        <div ref={searchContainerRef} className="relative flex-1">
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowResults(true)}
            placeholder={placeholder || t('scanOrSearch')}
            className="flex-1"
          />
          {showResults && (
            <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
              <div className="max-h-64 overflow-y-auto p-1">
                {isSearchLoading ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">{tCommon('loading')}</div>
                ) : searchResults.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">{tCommon('noData')}</div>
                ) : (
                  searchResults.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                      onClick={() => {
                        onScan(product.itemCode);
                        setSearchValue('');
                        setShowResults(false);
                      }}
                    >
                      <div className="font-mono font-medium">{product.itemCode}</div>
                      {product.description && (
                        <div className="line-clamp-2 text-xs text-muted-foreground">{product.description}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
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
