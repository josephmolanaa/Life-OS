import { TransactionCategoryFields } from '@/components/finance/transaction-category-fields';
import { ActionForm } from '@/components/finance/action-form';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AmountInput } from '@/components/finance/amount-input';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { Shell } from '@/components/finance/layout';
import { deleteTransaction, updateTransaction } from '@/lib/actions';
import { listActiveWallets, requireFinanceUser } from '@/lib/data';
import { copy, getLang } from '@/lib/i18n';
import type { Category, Transaction } from '@/lib/types';

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireFinanceUser();

  const lang = await getLang();
  const t = copy[lang];
  const [transactionResult, walletsResult, categoriesResult] = await Promise.all([
    supabase.from('transactions').select('*, categories(*), wallets(*)').eq('id', id).eq('user_id', user.id).single(),
    listActiveWallets(user.id),
    supabase.from('categories').select('*').eq('user_id', user.id).order('type').order('name'),
  ]);

  if (transactionResult.error || !transactionResult.data) notFound();

  const transaction = transactionResult.data as Transaction;
  const wallets = transaction.wallets && !walletsResult.some(wallet => wallet.id === transaction.wallet_id) ? [...walletsResult, transaction.wallets] : walletsResult;
  if (categoriesResult.error) throw new Error(categoriesResult.error.message);
  const categories = (categoriesResult.data ?? []) as Category[];

  return <Shell title={lang === 'id' ? 'Edit transaksi' : 'Edit transaction'} quickFab={false}>
    <div className="editPageNav"><Link className="btn ghost" href={`/finance/transactions?date=${transaction.transaction_date}`}>{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali ke transaksi' : 'Back to transactions'}</Link><form action={deleteTransaction}><input type="hidden" name="id" value={transaction.id}/><input type="hidden" name="date" value={transaction.transaction_date}/><ConfirmSubmit message={lang === 'id' ? 'Hapus transaksi ini?' : 'Delete this transaction?'}>{t.delete}</ConfirmSubmit></form></div>
    <ActionForm className="card form editTransactionPageForm" action={updateTransaction} lang={lang}>
      <input type="hidden" name="id" value={transaction.id}/>
      <TransactionCategoryFields categories={categories} type={transaction.type} categoryId={transaction.category_id} lang={lang}/>
      <label><span>{lang === 'id' ? 'Tanggal' : 'Date'}</span><input className="input" type="date" name="date" required defaultValue={transaction.transaction_date}/></label>
      <label><span>{lang === 'id' ? 'Dompet' : 'Wallet'}</span><select className="input" name="wallet_id" required defaultValue={transaction.wallet_id}>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select></label>
      <label><span>{lang === 'id' ? 'Jumlah' : 'Amount'}</span><AmountInput name="amount" placeholder={t.amountPlaceholder} required defaultValue={Number(transaction.amount)}/></label>
      <label><span>{t.optionalNote}</span><textarea className="input" name="note" rows={3} defaultValue={transaction.note ?? ''}/></label>
      <div className="editTransactionButtons"><button className="btn">{t.saveEdit}</button></div>
    </ActionForm>
  </Shell>;
}
