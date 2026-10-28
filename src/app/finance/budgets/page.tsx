import Link from 'next/link';
import { ActionForm } from '@/components/finance/action-form';
import { AmountInput } from '@/components/finance/amount-input';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { Shell } from '@/components/finance/layout';
import { createBudget, deleteBudget } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { money } from '@/lib/finance';
import { getLang } from '@/lib/i18n';

export default async function Budgets({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const data = await requireFinance();
  const id = await getLang() === 'id';
  const used = (categoryId: string) => data.transactions.filter(t => t.type === 'expense' && t.category_id === categoryId).reduce((sum, transaction) => sum + Number(transaction.amount), 0);

  return <Shell title={id ? 'Budget' : 'Budgets'}>
    <div className="editPageNav"><Link className="btn ghost" href="/finance">{String.fromCodePoint(8592)} {id ? 'Kembali ke Finance' : 'Back to Finance'}</Link></div>
    {params.error && <div className="notice error">{params.error}</div>}
    <ActionForm className="card form" action={createBudget}>
      <b>{id ? 'Budget bulanan' : 'Monthly budget'}</b>
      <input className="input" name="month" type="month" defaultValue={data.bounds.month}/>
      <select className="input" name="category_id" required>{data.categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <AmountInput name="amount" placeholder={id ? 'Limit, contoh 2.000.000' : 'Limit, e.g. 2,000,000'}/>
      <button className="btn">{id ? 'Simpan budget' : 'Save budget'}</button>
    </ActionForm>
    <div className="list sectionGap">{data.budgets.map(b => {
      const usage = used(b.category_id); const over = usage > Number(b.amount);
      return <div className="item" key={b.id}>
        <span>{b.categories?.name}<br/><small className={over ? 'negative' : 'muted'}>{over ? (id ? 'Melebihi budget' : 'Overbudget') : (id ? 'Sisa' : 'Remaining')} {money.format(Number(b.amount) - usage)}</small></span>
        <b>{money.format(usage)} / {money.format(Number(b.amount))}</b>
        <form action={deleteBudget}><input type="hidden" name="id" value={b.id}/><ConfirmSubmit message={id ? 'Hapus budget ini?' : 'Delete this budget?'}>{id ? 'Hapus' : 'Delete'}</ConfirmSubmit></form>
      </div>;
    })}</div>
  </Shell>;
}
