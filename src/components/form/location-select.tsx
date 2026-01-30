'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { Location } from '@/db/schema';

interface LocationSelectProps {
  label: string;
  locations: Location[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function LocationSelect({
  label,
  locations,
  value,
  onChange,
  placeholder = 'Select location',
}: LocationSelectProps) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.code}>
              {loc.code}
              {loc.name && <span className="text-muted-foreground"> - {loc.name}</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
