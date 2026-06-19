import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AmountInput } from '@/components/finance/amount-input';
import { money } from '@/lib/finance';
import { createTransaction, createTransfer } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { Shell } from '@/components/finance/layout';
import { copy, getLang } from '@/lib/i18n';

function dateInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateInputValue(date);
}

function formatDay(value: string, lang: 'en' | 'id') {
  return new Intl.DateTimeFormat(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

export default async function Transactions({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const selectedDate = params.date ?? dateInputValue();
  const data = await requireFinance(selectedDate.slice(0, 7));
  const lang = await getLang();
  const t = copy[lang];
  const activeWallets = data.wallets.filter(w => !w.is_archived);
  const hasCategories = data.categories.length > 0;
  const dayTransactions = data.transactions.filter(tx => tx.transaction_date === selectedDate);
  const dayIncome = dayTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const dayExpense = dayTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const dayBalance = dayIncome - dayExpense;
  const prevDate = shiftDate(selectedDate, -1);
  const nextDate = shiftDate(selectedDate, 1);

  const transactionForm = <form className="card form" action={createTransaction}>
    <b>{t.quickIncomeExpense}</b>
    <select className="input" name="type"><option value="expense">Expense</option><option value="income">Income</option></select>
    <input className="input" type="date" name="date" defaultValue={selectedDate}/>
    <AmountInput name="amount" placeholder={t.amountPlaceholder} required/>
    <select className="input" name="wallet_id" required>{activeWallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
    <select className="input" name="category_id" required disabled={!hasCategories}>{hasCategories ? data.categories.map(c => <option key={c.id} value={c.id}>{c.type} - {c.name}</option>) : <option value="">{t.noCategoryOption}</option>}</select>
    <input className="input" name="note" placeholder={t.optionalNote}/>
    <button className="btn" disabled={!hasCategories}>{t.saveTransaction}</button>
  </form>;
  const transferForm = <form className="card form" action={createTransfer}>
    <b>{t.transferWallet}</b>
    <input className="input" type="date" name="date" defaultValue={selectedDate}/>
    <AmountInput name="amount" placeholder={t.amountPlaceholder} required/>
    <select className="input" name="from_wallet_id">{data.wallets.map(w => <option key={w.id} value={w.id}>{t.fromWallet} {w.name}</option>)}</select>
    <select className="input" name="to_wallet_id">{data.wallets.map(w => <option key={w.id} value={w.id}>{t.toWallet} {w.name}</option>)}</select>
    <input className="input" name="note" placeholder={t.notePlaceholder}/>
    <button className="btn">{t.transfer}</button>
  </form>;

  return <Shell title={t.transactionsTitle}>
    <div className="daySwitcher">
      <Link className="dayArrow" href={`/finance/transactions?date=${prevDate}`} aria-label="Previous day">&lsaquo;</Link>
      <form className="dayPicker" action="/finance/transactions"><input className="input" type="date" name="date" defaultValue={selectedDate}/><button className="btn ghost">{formatDay(selectedDate, lang)}</button></form>
      <Link className="dayArrow" href={`/finance/transactions?date=${nextDate}`} aria-label="Next day">&rsaquo;</Link>
    </div>
    <div className="daySummary card">
      <div><span>{t.income}</span><b className="positive">{money.format(dayIncome)}</b></div>
      <div><span>{t.expense}</span><b className="negative">{money.format(dayExpense)}</b></div>
      <div><span>{t.totalBalance}</span><b className={dayBalance >= 0 ? 'positive' : 'negative'}>{money.format(dayBalance)}</b></div>
    </div>
    <div className="grid grid2 desktopTransactionForms">{transactionForm}{transferForm}</div>
    <div className="list transactionList sectionGap">{dayTransactions.map(tx => <Link className="item transactionItem" key={tx.id} href={`/finance/transactions/${tx.id}/edit`} aria-label={t.edit}>
      <span className="transactionInfo">{tx.categories?.name}<br/><small className="muted">{tx.transaction_date} - {tx.wallets?.name} - {tx.note}</small></span>
      <b className={`transactionAmount ${tx.type === 'income' ? 'positive' : 'negative'}`}>{tx.type === 'income' ? '+' : '-'}{money.format(Number(tx.amount))}</b>
      <span className="transactionActions transactionArrow" aria-hidden="true"><ChevronRight size={18} strokeWidth={2.5}/></span>
    </Link>)}</div>
  </Shell>;
}