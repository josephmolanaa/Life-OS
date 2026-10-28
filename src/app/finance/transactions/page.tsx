import { PrivacyAmount } from '@/components/finance/privacy-amount';
﻿import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { money } from '@/lib/finance';
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

export default async function Transactions({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const params = await searchParams;
  const candidate = params.date ?? '';
  const parsed = new Date(`${candidate}T00:00:00Z`);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(candidate) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : dateInputValue();
  const data = await requireFinance(selectedDate.slice(0, 7));
  const lang = await getLang();
  const t = copy[lang];
  const dayTransactions = data.transactions.filter(tx => tx.transaction_date === selectedDate);
  const dayTransfers = data.transfers.filter(transfer => transfer.transfer_date === selectedDate);
  const walletNames = new Map(data.wallets.map(wallet => [wallet.id, wallet.name]));
  const dayIncome = dayTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const dayExpense = dayTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const dayBalance = dayIncome - dayExpense;
  const prevDate = shiftDate(selectedDate, -1);
  const nextDate = shiftDate(selectedDate, 1);

  return <Shell title={t.transactionsTitle}>
    <div className="transactionPage">
    <div className="editPageNav transactionPageNav">
      <Link className="btn ghost" href="/finance">{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali ke Finance' : 'Back to Finance'}</Link>
      <Link className="btn" href={`/finance/transactions/new?type=expense&date=${selectedDate}`}>+ {lang === 'id' ? 'Tambah transaksi' : 'Add transaction'}</Link>
    </div>
    <div className="daySwitcher">
      <Link className="dayArrow" href={`/finance/transactions?date=${prevDate}`} aria-label={lang === 'id' ? 'Hari sebelumnya' : 'Previous day'}>&lsaquo;</Link>
      <form className="dayPicker" action="/finance/transactions" aria-label={lang === 'id' ? 'Pilih tanggal transaksi' : 'Choose transaction date'}>
        <label htmlFor="transaction-date" className="srOnly">{lang === 'id' ? 'Tanggal transaksi' : 'Transaction date'}</label>
        <input id="transaction-date" className="input" type="date" name="date" defaultValue={selectedDate}/>
        <button className="btn ghost" type="submit">{lang === 'id' ? 'Tampilkan' : 'Show'}</button>
      </form>
      <Link className="dayArrow" href={`/finance/transactions?date=${nextDate}`} aria-label={lang === 'id' ? 'Hari berikutnya' : 'Next day'}>&rsaquo;</Link>
    </div>
    <div className="daySummary card">
      <div><span>{t.income}</span><b className="positive"><PrivacyAmount value={money.format(dayIncome)}/></b></div>
      <div><span>{t.expense}</span><b className="negative"><PrivacyAmount value={money.format(dayExpense)}/></b></div>
      <div><span>{t.totalBalance}</span><b className={dayBalance >= 0 ? 'positive' : 'negative'}><PrivacyAmount value={money.format(dayBalance)}/></b></div>
    </div>
    <nav className="reportTabs" aria-label={lang === 'id' ? 'Tambah jenis transaksi' : 'Add transaction type'}>{(['expense', 'income', 'transfer'] as const).map(type => <Link key={type} className="reportTab" href={`/finance/transactions/new?type=${type}&date=${selectedDate}`}>{t[type]}</Link>)}</nav>
    {!dayTransactions.length && !dayTransfers.length && <div className="card empty"><span>{lang === 'id' ? 'Belum ada transaksi pada tanggal ini.' : 'No transactions on this date.'}</span><Link className="btn ghost" href={`/finance/transactions/new?type=expense&date=${selectedDate}`}>{lang === 'id' ? 'Catat transaksi' : 'Record a transaction'}</Link></div>}
    <div className="list transactionList sectionGap">{dayTransactions.map(tx => <Link className="item transactionItem" key={tx.id} href={`/finance/transactions/${tx.id}/edit`} aria-label={`${t.edit}: ${tx.categories?.name ?? tx.note ?? tx.transaction_date}`}>
      <span className="transactionInfo">{tx.categories?.name ?? tx.note ?? (lang === 'id' ? 'Tanpa kategori' : 'No category')}<br/><small className="muted">{tx.transaction_date} - {tx.wallets?.name ?? (lang === 'id' ? 'Dompet' : 'Wallet')}{tx.note ? ` - ${tx.note}` : ''}</small></span>
      <b className={`transactionAmount ${tx.type === 'income' ? 'positive' : 'negative'}`}>{tx.type === 'income' ? '+' : '-'}<PrivacyAmount value={money.format(Number(tx.amount))}/></b>
      <span className="transactionActions transactionArrow" aria-hidden="true"><ChevronRight size={18} strokeWidth={2.5}/></span>
    </Link>)}{dayTransfers.map(transfer => <div className="item transactionItem transferItem" key={`transfer-${transfer.id}`}>
      <span className="transactionInfo"><span className="transferBadge">{t.transfer}</span>{transfer.note ? ` ${transfer.note}` : ''}<br/><small className="muted">{transfer.transfer_date} - {walletNames.get(transfer.from_wallet_id) ?? (lang === 'id' ? 'Dompet asal' : 'Source wallet')} → {walletNames.get(transfer.to_wallet_id) ?? (lang === 'id' ? 'Dompet tujuan' : 'Destination wallet')}</small></span>
      <b className="transactionAmount transferAmount"><PrivacyAmount value={money.format(Number(transfer.amount))}/></b>
      <span className="transactionActions transferMarker" aria-hidden="true">↔</span>
    </div>)}</div>
    </div>
  </Shell>;
}
