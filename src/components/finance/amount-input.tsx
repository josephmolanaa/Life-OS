'use client';

import { useState } from 'react';

export function parseAmountInput(value: string, allowDecimal: boolean): string | null {
  if (!value) return '';
  if (!allowDecimal) {
    return /^\d+$/.test(value) ? value
      : /^\d{1,3}(?:([.,])\d{3})(?:\1\d{3})*$/.test(value) ? value.replace(/[.,]/g, '') : null;
  }
  if (/^\d+(?:[.,]\d*)?$/.test(value)) return value.replace(',', '.');
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d*)?$/.test(value)) return value.replace(/\./g, '').replace(',', '.');
  return null;
}

function formatNumber(value: string, allowDecimal: boolean) {
  if (!value) return '';
  const [whole, decimal] = value.split('.');
  const formattedWhole = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return allowDecimal && decimal !== undefined ? `${formattedWhole},${decimal}` : formattedWhole;
}

export function AmountInput({ name, placeholder = 'Jumlah', required = false, allowDecimal = false, defaultValue = '' }: { name: string; placeholder?: string; required?: boolean; allowDecimal?: boolean; defaultValue?: string | number }) {
  const decimalsEnabled = allowDecimal || /\.\d*[1-9]/.test(String(defaultValue));
  const [raw, setRaw] = useState(String(defaultValue));
  const [displayValue, setDisplayValue] = useState(() => formatNumber(String(defaultValue), decimalsEnabled));
  const [valid, setValid] = useState(true);

  return <>
    <input type="hidden" name={name} value={raw} />
    <input
      className="input amountInput"
      inputMode={decimalsEnabled ? 'decimal' : 'numeric'}
      value={displayValue}
      placeholder={placeholder}
      required={required}
      onFocus={() => { if (valid) setDisplayValue(raw.replace('.', ',')); }}
      onBlur={() => { if (valid) setDisplayValue(formatNumber(raw, decimalsEnabled)); }}
      onChange={(event) => {
        const value = event.currentTarget.value;
        const parsed = parseAmountInput(value, decimalsEnabled);
        event.currentTarget.setCustomValidity(parsed === null ? 'Enter a valid non-negative amount' : '');
        setValid(parsed !== null);
        setRaw(parsed ?? value);
        setDisplayValue(value);
      }}
    />
  </>;
}
