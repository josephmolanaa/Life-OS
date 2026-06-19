'use client';

import { useMemo, useState } from 'react';

function onlyNumber(value: string, allowDecimal: boolean) {
  const normalized = value.replace(/,/g, '.');
  const chars = normalized.replace(allowDecimal ? /[^0-9.]/g : /\D/g, '');
  if (!allowDecimal) return chars;
  const [head, ...tail] = chars.split('.');
  return tail.length ? `${head}.${tail.join('')}` : head;
}

function formatNumber(value: string, allowDecimal: boolean) {
  if (!value) return '';
  const [whole, decimal] = value.split('.');
  const formattedWhole = whole.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return allowDecimal && decimal !== undefined ? `${formattedWhole},${decimal}` : formattedWhole;
}

export function AmountInput({ name, placeholder = 'Jumlah', required = false, allowDecimal = false, defaultValue = '' }: { name: string; placeholder?: string; required?: boolean; allowDecimal?: boolean; defaultValue?: string | number }) {
  const [raw, setRaw] = useState(String(defaultValue));
  const displayValue = useMemo(() => formatNumber(raw, allowDecimal), [raw, allowDecimal]);

  return <>
    <input type="hidden" name={name} value={raw} />
    <input
      className="input amountInput"
      inputMode={allowDecimal ? 'decimal' : 'numeric'}
      value={displayValue}
      placeholder={placeholder}
      required={required}
      onChange={(event) => setRaw(onlyNumber(event.target.value, allowDecimal))}
    />
  </>;
}
