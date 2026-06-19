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
  const wallets = walletsResult;
  const categories = (categoriesResult.data ?? []) as Category[];

  return <Shell title={lang === 'id' ? 'Edit transaksi' : 'Edit transaction'} quickFab={false}>
    <div className="editPageNav"><Link className="btn ghost" href="/finance/transactions">{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali' : 'Back'}</Link><form action={deleteTransaction}><input type="hidden" name="id" value={transaction.id}/><ConfirmSubmit message={lang === 'id' ? 'Hapus transaksi ini?' : 'Delete this transaction?'}>{t.delete}</ConfirmSubmit></form></div>
    <form className="card form editTransactionPageForm" action={updateTransaction}>
      <input type="hidden" name="id" value={transaction.id}/>
      <div className="editTypeTabs">
        <label><input type="radio" name="type" value="expense" defaultChecked={transaction.type === 'expense'}/><span>Expense</span></label>
        <label><input type="radio" name="type" value="income" defaultChecked={transaction.type === 'income'}/><span>Income</span></label>
      </div>
      <input className="input" type="date" name="date" defaultValue={transaction.transaction_date}/>
      <select className="input" name="wallet_id" required defaultValue={transaction.wallet_id}>{wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}</select>
      <AmountInput name="amount" placeholder={t.amountPlaceholder} required defaultValue={Number(transaction.amount)}/>
      <select className="input" name="category_id" required defaultValue={transaction.category_id}>{categories.map(category => <option key={category.id} value={category.id}>{category.type} - {category.name}</option>)}</select>
      <input className="input" name="note" placeholder={t.notePlaceholder} defaultValue={transaction.note ?? ''}/>
      <div className="editTransactionButtons"><button className="btn">{t.saveEdit}</button></div>
    </form>
  </Shell>;
}
