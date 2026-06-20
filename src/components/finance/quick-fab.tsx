'use client';

import Link from 'next/link';
import { ArrowLeftRight, HandCoins, Plus, ShoppingBasket } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function QuickFab({ transfer, income, expense }: { transfer: string; income: string; expense: string }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: MouseEvent | TouchEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('touchstart', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('touchstart', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    setTimeout(() => setDate(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)), 0);
  }, []);

  return <div ref={rootRef} className={`mobileTransactionFab ${open ? 'isOpen' : ''}`} style={{display: 'block'}}>
    {open && <div className="mobileFabBackdrop" aria-hidden="true" onClick={() => setOpen(false)}/>} 
    {open && <div className="mobileQuickPopup" role="menu">
      <Link className="quickChoice transfer" href={`/finance/transactions/new?type=transfer&date=${date}`} role="menuitem" onClick={() => setOpen(false)}><span>{transfer}</span><span className="quickIcon"><ArrowLeftRight size={22}/></span></Link>
      <Link className="quickChoice income" href={`/finance/transactions/new?type=income&date=${date}`} role="menuitem" onClick={() => setOpen(false)}><span>{income}</span><span className="quickIcon"><HandCoins size={22}/></span></Link>
      <Link className="quickChoice expense" href={`/finance/transactions/new?type=expense&date=${date}`} role="menuitem" onClick={() => setOpen(false)}><span>{expense}</span><span className="quickIcon"><ShoppingBasket size={22}/></span></Link>
    </div>}
    <button className="fab" type="button" aria-label="Add transaction" aria-expanded={open} onClick={() => setOpen(value => !value)}><Plus size={30}/></button>
  </div>;
}
