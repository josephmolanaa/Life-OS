'use client';

import { usePrivacy } from '@/components/finance/privacy-context';

export function PrivacyAmount({ value, currency, className }: { value: string; currency?: string; className?: string }) {
  const { hidden, maskValue, maskCurrency } = usePrivacy();
  const display = hidden ? (currency ? maskCurrency(currency) : maskValue(value)) : value;
  return <span className={className}>{display}</span>;
}
