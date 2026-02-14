'use client';

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { searchCustomers } from '../customers/actions';
import type { Customer } from '@/db/schema';

interface CustomerInfo {
  customerId?: string;
  name: string;
  contactName: string;
  address: string;
  phone: string;
  email: string;
}

interface CustomerSelectProps {
  label: string;
  value: CustomerInfo;
  onChange: (value: CustomerInfo) => void;
}

export function CustomerSelect({ label, value, onChange }: CustomerSelectProps) {
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (value.name && !value.customerId) {
        const results = await searchCustomers(value.name);
        setSearchResults(results);
        setShowDropdown(results.length > 0);
      } else {
        setShowDropdown(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value.name, value.customerId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onChange({
      customerId: customer.id,
      name: customer.name,
      contactName: customer.contactName || '',
      address: customer.address || '',
      phone: customer.phone || '',
      email: customer.email || '',
    });
    setShowDropdown(false);
  };

  const handleFieldChange = (field: keyof CustomerInfo, val: string) => {
    onChange({ ...value, [field]: val, ...(field === 'name' ? { customerId: undefined } : {}) });
  };

  return (
    <div ref={containerRef} className="space-y-2 rounded-lg border p-3">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="relative">
        <Input
          value={value.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          placeholder="Business Name"
          className="font-medium"
        />
        {showDropdown && searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="max-h-48 overflow-y-auto p-1">
              {searchResults.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => handleSelect(customer)}
                >
                  <div className="font-medium">{customer.name}</div>
                  {customer.contactName && (
                    <div className="text-xs text-muted-foreground">{customer.contactName}</div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <Input
        value={value.contactName}
        onChange={(e) => handleFieldChange('contactName', e.target.value)}
        placeholder="Contact Name"
        className="text-sm"
      />
      <Input
        value={value.address}
        onChange={(e) => handleFieldChange('address', e.target.value)}
        placeholder="Address"
        className="text-sm"
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={value.phone}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          placeholder="Phone"
          className="text-sm"
        />
        <Input
          value={value.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          placeholder="Email"
          className="text-sm"
        />
      </div>
    </div>
  );
}
