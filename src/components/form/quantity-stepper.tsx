'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Minus, Plus } from 'lucide-react';

interface QuantityStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function QuantityStepper({
  label,
  value,
  onChange,
  min = 0,
  max = 9999
}: QuantityStepperProps) {
  const decrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const increment = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  }, [min, max, onChange]);

  return (
    <div className="flex items-center justify-between">
      <Label className="text-base font-medium">{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl text-lg active:scale-95 transition-transform"
          onClick={decrement}
          disabled={value <= min}
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Input
          type="number"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          className="h-12 w-20 text-center text-lg font-semibold rounded-xl"
          min={min}
          max={max}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-12 w-12 rounded-xl text-lg active:scale-95 transition-transform"
          onClick={increment}
          disabled={value >= max}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
