'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type PrivacyContextType = {
  hidden: boolean;
  toggleHidden: () => void;
  maskValue: (value: string) => string;
  maskCurrency: (currency: string) => string;
};

const hiddenDigits = '••••••••';

function currencySymbol(currency?: string) {
  return currency?.trim().toUpperCase() === 'IDR' ? 'Rp' : currency?.trim().toUpperCase() || 'IDR';
}

const PrivacyContext = createContext<PrivacyContextType>({
  hidden: false,
  toggleHidden: () => {},
  maskValue: (val) => val,
  maskCurrency: (curr) => curr,
});

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('finance-privacy-hidden');
      if (stored === 'true') { setTimeout(() => setHidden(true), 0); }
    } catch {}
  }, []);

  const toggleHidden = () => {
    setHidden(prev => {
      const next = !prev;
      try { localStorage.setItem('finance-privacy-hidden', String(next)); } catch {}
      return next;
    });
  };

  const maskValue = (value: string) => {
    if (!hidden) return value;
    const currency = value.match(/^[^\d-]+/)?.[0]?.trim();
    return `${currencySymbol(currency)} ${hiddenDigits}`;
  };

  const maskCurrency = (currency: string) => {
    if (!hidden) return currency;
    return `${currencySymbol(currency)} ${hiddenDigits}`;
  };

  return <PrivacyContext.Provider value={{ hidden, toggleHidden, maskValue, maskCurrency }}>
    {children}
  </PrivacyContext.Provider>;
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}
