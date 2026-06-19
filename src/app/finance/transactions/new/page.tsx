import Link from 'next/link';
import { CalendarDays, Calculator, Mic } from 'lucide-react';
import { AmountInput } from '@/components/finance/amount-input';
import { createTransaction, createTransfer } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { Shell } from '@/components/finance/layout';
import { copy, getLang } from '@/lib/i18n';
import { WalletPicker, TransferWalletPickers } from '@/components/finance/wallet-picker';
import { TransactionTitlePicker } from '@/components/finance/transaction-title-picker';

function dateInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function timeInputValue(date = new Date()) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function displayDate(value: string, lang: 'en' | 'id') {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string; date?: string }> }) {
  const params = await searchParams;
  const selectedType = params.type === 'transfer' || params.type === 'income' ? params.type : 'expense';
  const selectedDate = params.date ?? dateInputValue();
  const data = await requireFinance(selectedDate.slice(0, 7));
  const lang = await getLang();
  const t = copy[lang];
  const activeWallets = data.wallets.filter(wallet => !wallet.is_archived);
  const categories = data.categories.filter(category => category.type === selectedType);
  const title = selectedType === 'transfer' ? t.transfer : 'Add Transaction';

  return <Shell title={title} quickFab={false}>
    <div className="editPageNav"><Link className="btn ghost" href={`/finance/transactions?date=${selectedDate}`}>{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali' : 'Back'}</Link></div>
    {selectedType === 'transfer' ? <form className="card form editTransactionPageForm" action={createTransfer}>
      <b>{t.transferWallet}</b>
      <input className="input" type="date" name="date" defaultValue={selectedDate}/>
      <AmountInput name="amount" placeholder={t.amountPlaceholder} required/>
      <TransferWalletPickers wallets={activeWallets} fromLabel={t.fromWallet} toLabel={t.toWallet}/>
      <input className="input" name="note" placeholder={t.notePlaceholder}/>
      <button className="btn">{t.transfer}</button>
    </form> : <form className="sepranTransactionForm" action={createTransaction}>
      <input type="hidden" name="type" value={selectedType}/>
      <div className="sepranDateRow">
        <label className="sepranField dateField"><span>{displayDate(selectedDate, lang)}</span><CalendarDays size={23}/><input type="date" name="date" defaultValue={selectedDate}/></label>
        <label className="sepranField timeField"><span>{timeInputValue()}</span><input type="time" defaultValue={timeInputValue()}/></label>
      </div>
      <WalletPicker wallets={activeWallets} defaultOpen={true}/>
      <label className="sepranField amountField"><AmountInput name="amount" placeholder="Enter the amount" required/><Calculator size={23}/></label>
      <TransactionTitlePicker categories={categories.map(category => ({ id: category.id, name: category.name }))} placeholder="Type here for new title"/>
      <label className="sepranField"><input placeholder="Description (optional)"/><Mic size={23}/></label>
      <div className="sepranSave"><button className="btn" disabled={categories.length === 0}>{t.saveTransaction}</button></div>
      {categories.length === 0 && <small className="muted">{t.noCategoryOption}</small>}
    </form>}
  </Shell>;
}
