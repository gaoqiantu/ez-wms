'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
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

interface CustomerChangeMeta {
  source: 'select' | 'input';
  field?: keyof CustomerInfo;
  customer?: Customer;
}

interface CustomerSelectProps {
  label: string;
  addressType: 'billTo' | 'shipTo';
  value: CustomerInfo;
  onChange: (value: CustomerInfo, meta: CustomerChangeMeta) => void;
}

export function CustomerSelect({ label, addressType, value, onChange }: CustomerSelectProps) {
  const tInvoices = useTranslations('invoices');
  const tCustomers = useTranslations('customers');
  const tCommon = useTranslations('common');
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [addressResults, setAddressResults] = useState<string[]>([]);
  const [showBusinessDropdown, setShowBusinessDropdown] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const businessRequestRef = useRef(0);
  const addressRequestRef = useRef(0);

  const getAddressFromCustomer = useCallback((customer: Customer) => {
    if (addressType === 'billTo') {
      return customer.billToAddress || customer.address || customer.shipToAddress || '';
    }
    return customer.shipToAddress || customer.address || customer.billToAddress || '';
  }, [addressType]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const requestId = ++businessRequestRef.current;
      try {
        const results = await searchCustomers(value.name.trim());
        if (requestId === businessRequestRef.current) {
          setSearchResults(results);
        }
      } catch {
        if (requestId === businessRequestRef.current) {
          setSearchResults([]);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value.name]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const requestId = ++addressRequestRef.current;
      const query = value.address.trim() || value.name.trim();
      try {
        const results = await searchCustomers(query);
        if (requestId !== addressRequestRef.current) return;

        const unique = new Set<string>();
        for (const customer of results) {
          const addr = getAddressFromCustomer(customer).trim();
          if (addr) unique.add(addr);
        }
        setAddressResults(Array.from(unique));
      } catch {
        if (requestId === addressRequestRef.current) {
          setAddressResults([]);
        }
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [addressType, getAddressFromCustomer, value.address, value.name]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowBusinessDropdown(false);
        setShowAddressDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    const nextValue = {
      customerId: customer.id,
      name: customer.name,
      contactName: customer.contactName || '',
      address: getAddressFromCustomer(customer),
      phone: customer.phone || '',
      email: customer.email || '',
    };

    onChange(nextValue, {
      source: 'select',
      field: 'name',
      customer,
    });
    setShowBusinessDropdown(false);
    setShowAddressDropdown(false);
  };

  const handleFieldChange = (field: keyof CustomerInfo, val: string) => {
    onChange(
      { ...value, [field]: val, ...(field === 'name' ? { customerId: undefined } : {}) },
      { source: 'input', field },
    );
    if (field === 'name') {
      setShowBusinessDropdown(true);
    }
    if (field === 'address') {
      setShowAddressDropdown(true);
    }
  };

  const trimmedName = value.name.trim();
  const hasExactNameMatch = searchResults.some(
    (customer) => customer.name.trim().toLowerCase() === trimmedName.toLowerCase(),
  );
  const filteredAddressResults = addressResults.filter((address) =>
    value.address.trim()
      ? address.toLowerCase().includes(value.address.trim().toLowerCase())
      : true,
  );

  return (
    <div ref={containerRef} className="space-y-2 rounded-lg border p-3">
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="relative">
        <Input
          value={value.name}
          onChange={(e) => handleFieldChange('name', e.target.value)}
          onFocus={() => setShowBusinessDropdown(true)}
          placeholder={tInvoices('selectCustomer')}
          className="font-medium"
        />
        {showBusinessDropdown && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="max-h-48 overflow-y-auto p-1">
              {trimmedName && !hasExactNameMatch && (
                <button
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => setShowBusinessDropdown(false)}
                >
                  <div className="font-medium">{trimmedName}</div>
                  <div className="text-xs text-muted-foreground">{tInvoices('newCustomer')}</div>
                </button>
              )}
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
                  {(customer.billToAddress || customer.shipToAddress || customer.address) && (
                    <div className="text-xs text-muted-foreground">
                      {addressType === 'billTo'
                        ? (customer.billToAddress || customer.address || customer.shipToAddress)
                        : (customer.shipToAddress || customer.address || customer.billToAddress)}
                    </div>
                  )}
                </button>
              ))}
              {searchResults.length === 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground">{tCommon('noData')}</div>
              )}
            </div>
          </div>
        )}
      </div>
      <Input
        value={value.contactName}
        onChange={(e) => handleFieldChange('contactName', e.target.value)}
        placeholder={tCustomers('contactName')}
        className="text-sm"
      />
      <div className="relative">
        <Input
          value={value.address}
          onChange={(e) => handleFieldChange('address', e.target.value)}
          onFocus={() => setShowAddressDropdown(true)}
          placeholder={addressType === 'billTo' ? tCustomers('billToAddress') : tCustomers('shipToAddress')}
          className="text-sm"
        />
        {showAddressDropdown && filteredAddressResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
            <div className="max-h-48 overflow-y-auto p-1">
              {filteredAddressResults.map((address) => (
                <button
                  key={address}
                  type="button"
                  className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(
                      { ...value, address },
                      { source: 'select', field: 'address' },
                    );
                    setShowAddressDropdown(false);
                  }}
                >
                  {address}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={value.phone}
          onChange={(e) => handleFieldChange('phone', e.target.value)}
          placeholder={tCustomers('phone')}
          className="text-sm"
        />
        <Input
          value={value.email}
          onChange={(e) => handleFieldChange('email', e.target.value)}
          placeholder={tCustomers('email')}
          className="text-sm"
        />
      </div>
    </div>
  );
}
