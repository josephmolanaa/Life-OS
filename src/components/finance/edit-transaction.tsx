'use client';

import { useEffect, useRef, useState } from 'react';
import { AmountInput } from '@/components/finance/amount-input';
import { updateTransaction } from '@/lib/actions';
import type { Category, Transaction, Wallet } from '@/lib/types';

export function EditTransaction({ transaction, wallets, categories, labels }: { transaction: Transaction; wallets: Wallet[]; categories: Category[]; labels: { edit: string; amount: string; note: string; save: string } }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return <div className="editTransaction" ref={rootRef}>
    <button className="btn ghost" type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{labels.edit}</button>
    {open && <form className="editTransactionPanel" action={updateTransaction}>
      <input type="hidden" name="id" value={transaction.id}/>
      <select className="input" name="type" defaultValue={transaction.type}><option value="expense">Expense</option><option value="income">Income</option></select>
      <input className="input" type="date" name="date" defaultValue={transaction.transaction_date}/>
      <AmountInput name="amount" placeholder={labels.amount} required defaultValue={Number(transaction.amount)}/>
      <select className="input" name="wallet_id" required defaultValue={transaction.wallet_id}>{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
      <select className="input" name="category_id" required defaultValue={transaction.category_id}>{categories.map(c => <option key={c.id} value={c.id}>{c.type} - {c.name}</option>)}</select>
      <input className="input" name="note" placeholder={labels.note} defaultValue={transaction.note ?? ''}/>
      <div className="editTransactionButtons"><button className="btn">{labels.save}</button></div>
    </form>}
  </div>;
}