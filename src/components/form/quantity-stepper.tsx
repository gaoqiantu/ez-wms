'use client';

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
  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    if (newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={decrement}
          disabled={value <= min}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          className="h-10 w-20 text-center"
          min={min}
          max={max}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={increment}
          disabled={value >= max}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
