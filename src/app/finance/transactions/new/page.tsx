import Link from 'next/link';
import { ActionForm } from '@/components/finance/action-form';
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

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string; date?: string }> }) {
  const params = await searchParams;
  const selectedType = params.type === 'transfer' || params.type === 'income' ? params.type : 'expense';
  const candidate = params.date ?? '';
  const parsed = new Date(`${candidate}T00:00:00Z`);
  const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(candidate) && Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === candidate ? candidate : dateInputValue();
  const data = await requireFinance(selectedDate.slice(0, 7));
  const lang = await getLang();
  const t = copy[lang];
  const activeWallets = data.wallets.filter(wallet => !wallet.is_archived);
  const canRecord = activeWallets.length > 0 && (selectedType !== 'transfer' || activeWallets.length > 1);
  const categories = data.categories.filter(category => category.type === selectedType);
  const title = selectedType === 'transfer' ? t.transfer : lang === 'id' ? 'Tambah transaksi' : 'Add transaction';

  return <Shell title={title} quickFab={false}>
    <div className="editPageNav"><Link className="btn ghost" href={`/finance/transactions?date=${selectedDate}`}>{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali' : 'Back'}</Link></div>
    <nav className="reportTabs" aria-label={lang === 'id' ? 'Jenis transaksi' : 'Transaction type'}>{(['expense', 'income', 'transfer'] as const).map(type => <Link key={type} className={`reportTab ${type === selectedType ? 'active' : ''}`} aria-current={type === selectedType ? 'page' : undefined} href={`/finance/transactions/new?type=${type}&date=${selectedDate}`}>{t[type]}</Link>)}</nav>
    {(!activeWallets.length || (selectedType === 'transfer' && activeWallets.length < 2)) && <div className="card empty transactionSetupNote"><p>{!activeWallets.length ? (lang === 'id' ? 'Tambahkan satu dompet aktif dulu. Kategori opsional.' : 'Add one active wallet first. Categories are optional.') : (lang === 'id' ? 'Transfer membutuhkan dua dompet aktif.' : 'Transfers need two active wallets.')}</p><Link className="btn ghost" href="/finance/wallets">{lang === 'id' ? 'Kelola dompet' : 'Manage wallets'}</Link></div>}
    {canRecord && <ActionForm className="card form editTransactionPageForm" action={selectedType === 'transfer' ? createTransfer : createTransaction} lang={lang}>
      <input type="hidden" name="type" value={selectedType}/>
      <label><span>{lang === 'id' ? 'Tanggal' : 'Date'}</span><input className="input" type="date" name="date" required defaultValue={selectedDate}/></label>
      {selectedType === 'transfer' ? <TransferWalletPickers wallets={activeWallets} fromLabel={t.fromWallet} toLabel={t.toWallet}/> : <WalletPicker wallets={activeWallets} labelPrefix={lang === 'id' ? 'Dompet' : 'Wallet'}/>}
      <label><span>{lang === 'id' ? 'Jumlah' : 'Amount'}</span><AmountInput name="amount" placeholder={t.amountPlaceholder} required/></label>
      {selectedType === 'transfer' ? <label><span>{t.optionalNote}</span><textarea className="input" name="note" rows={3}/></label> : <TransactionTitlePicker categories={categories} label={lang === 'id' ? 'Kategori' : 'Category'} emptyLabel={lang === 'id' ? 'Tanpa kategori' : 'No category'} placeholder={lang === 'id' ? 'Deskripsi (opsional)' : 'Description (optional)'}/>}
      <button className="btn" disabled={selectedType === 'transfer' ? activeWallets.length < 2 : !activeWallets.length}>{t.saveTransaction}</button>
    </ActionForm>}
  </Shell>;
}
