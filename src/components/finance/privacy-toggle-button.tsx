'use client';

import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/components/finance/privacy-context';

export function PrivacyToggleButton() {
  const { hidden, toggleHidden } = usePrivacy();
  return (
    <button
      onClick={(e) => { e.preventDefault(); toggleHidden(); }}
      title={hidden ? 'Show amounts' : 'Hide amounts'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--muted)',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {hidden ? <Eye size={16} /> : <EyeOff size={16} />}
    </button>
  );
}
