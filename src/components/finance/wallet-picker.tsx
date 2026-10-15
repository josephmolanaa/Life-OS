'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import Link from 'next/link';

type Wallet = { id: string; name: string; };

interface WalletPickerProps {
  wallets: Wallet[];
  name?: string;
  defaultValue?: string;
  className?: string;
  labelPrefix?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSelect?: (val: string) => void;
}

export function WalletPicker({ 
  wallets, 
  name = "wallet_id", 
  defaultValue, 
  className = "sepranField selectField", 
  labelPrefix = "",
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  onSelect
}: WalletPickerProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const [selected, setSelected] = useState(defaultValue || wallets[0]?.id || '');
  
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  
  const handleOpenChange = useCallback((newOpen: boolean) => {
    setUncontrolledOpen(newOpen);
    if (onOpenChange) onOpenChange(newOpen);
  }, [onOpenChange]);

  const handleSelect = (id: string) => {
    setSelected(id);
    handleOpenChange(false);
    if (onSelect) onSelect(id);
  };
  
  const selectedWallet = wallets.find(w => w.id === selected);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') handleOpenChange(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen, handleOpenChange]);

  return (
    <>
      <input type="hidden" name={name} value={selected} />
      <div className={className} onClick={() => handleOpenChange(true)} style={{ cursor: 'pointer' }}>
        <div style={{ flex: 1, color: 'var(--text)' }}>{labelPrefix}{selectedWallet?.name || 'Select Wallet'}</div>
        <ChevronDown size={22} />
      </div>

      {isOpen && (
        <div className="walletPickerOverlay" onClick={() => handleOpenChange(false)}>
          <div className="walletPickerSheet" onClick={e => e.stopPropagation()}>
            <div className="walletPickerHeader">
              <h3>Select Wallet</h3>
              <Link href="/finance/wallets" style={{ color: 'white' }}>
                <Pencil size={20} />
              </Link>
            </div>
            <div className="walletPickerGrid">
              {wallets.map(w => (
                <button 
                  key={w.id} 
                  type="button" 
                  className={`walletPickerBtn ${selected === w.id ? 'active' : ''}`}
                  onClick={() => handleSelect(w.id)}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TransferWalletPickers({ wallets, fromLabel, toLabel }: { wallets: Wallet[], fromLabel: string, toLabel: string }) {
  const [openFrom, setOpenFrom] = useState(true);
  const [openTo, setOpenTo] = useState(false);

  return (
    <>
      <WalletPicker 
        wallets={wallets} 
        name="from_wallet_id" 
        className="input walletPickerInput" 
        labelPrefix={`${fromLabel} `}
        open={openFrom}
        onOpenChange={setOpenFrom}
        onSelect={() => setOpenTo(true)}
      />
      <WalletPicker 
        wallets={wallets} 
        name="to_wallet_id" 
        className="input walletPickerInput" 
        labelPrefix={`${toLabel} `}
        open={openTo}
        onOpenChange={setOpenTo}
      />
    </>
  );
}
