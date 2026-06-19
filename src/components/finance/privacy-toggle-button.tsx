'use client';

import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/components/finance/privacy-context';

export function PrivacyToggleButton() {
  const { hidden, toggleHidden } = usePrivacy();

  return <button className="balanceToggle" type="button" aria-label={hidden ? 'Show balances' : 'Hide balances'} onClick={toggleHidden}>
    {hidden ? <EyeOff size={24} strokeWidth={2.4}/> : <Eye size={24} strokeWidth={2.4}/>} 
  </button>;
}