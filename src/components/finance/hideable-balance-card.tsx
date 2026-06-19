'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

export function HideableBalanceCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  const [hidden, setHidden] = useState(false);

  return <div className="card summary balanceSummary">
    <div className="muted">{label}</div>
    <div className="balanceValueRow">
      <div className="big">{hidden ? maskValue(value) : value}</div>
      <button className="balanceToggle" type="button" aria-label={hidden ? 'Show balance' : 'Hide balance'} onClick={() => setHidden(value => !value)}>
        {hidden ? <EyeOff size={24} strokeWidth={2.4}/> : <Eye size={24} strokeWidth={2.4}/>} 
      </button>
    </div>
    {helper && <small className="muted">{helper}</small>}
  </div>;
}

function maskValue(value: string) {
  const currency = value.match(/^[^\d-]+/)?.[0]?.trim();
  return `${currency || 'IDR'} ••••••••`;
}
