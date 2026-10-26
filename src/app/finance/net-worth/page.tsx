import { ActionForm } from '@/components/finance/action-form';
import { AmountInput } from '@/components/finance/amount-input';
import { TrendLine } from '@/components/finance/charts';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { Shell } from '@/components/finance/layout';
import Link from 'next/link';
import { LocalDateInput } from '@/components/finance/local-date-input';
import { createNetWorth, deleteNetWorth, updateNetWorth } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { money } from '@/lib/finance';
import { getLang } from '@/lib/i18n';

export default async function NetWorth({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const data = await requireFinance();
  const id = await getLang() === 'id';
  const latest = data.netWorth.at(-1);

  return <Shell title="Net Worth">
    <div className="editPageNav"><Link className="btn ghost" href="/finance">{String.fromCodePoint(8592)} {id ? 'Kembali ke Finance' : 'Back to Finance'}</Link></div>
    {params.error && <div className="notice error">{params.error}</div>}
    <div className="grid grid2"><div className="card"><div className="muted">{id ? 'Net worth terakhir' : 'Latest net worth'}</div><div className="big">{money.format(Number(latest?.net_worth_amount ?? 0))}</div></div><ActionForm className="card form" action={createNetWorth}><b>{id ? 'Snapshot manual' : 'Manual snapshot'}</b><LocalDateInput className="input" name="date"/><AmountInput name="assets_amount" placeholder={id ? 'Aset, contoh 50.000.000' : 'Assets, e.g. 50,000,000'}/><AmountInput name="liabilities_amount" placeholder={id ? 'Liabilitas, contoh 5.000.000' : 'Liabilities, e.g. 5,000,000'}/><input className="input" name="note" placeholder={id ? 'Catatan' : 'Note'}/><button className="btn">{id ? 'Simpan snapshot' : 'Save snapshot'}</button></ActionForm></div>
    <div className="card sectionGap"><b>Trend</b><TrendLine data={data.netWorth.map(n => ({name:n.snapshot_date,value:Number(n.net_worth_amount)}))}/></div>
    <div className="list sectionGap">{data.netWorth.map(n => <details className="card loanDetails" key={n.id}>
      <summary className="loanSummary"><span>{n.snapshot_date}<br/><small className="muted">{n.note}</small></span><b>{money.format(Number(n.net_worth_amount))}</b></summary>
      <ActionForm className="form spaced" action={updateNetWorth}><input type="hidden" name="id" value={n.id}/><input className="input" name="date" type="date" defaultValue={n.snapshot_date}/><AmountInput name="assets_amount" defaultValue={Number(n.assets_amount)}/><AmountInput name="liabilities_amount" defaultValue={Number(n.liabilities_amount)}/><input className="input" name="note" defaultValue={n.note ?? ''}/><button className="btn">{id ? 'Simpan edit' : 'Save changes'}</button></ActionForm>
      <form className="spaced" action={deleteNetWorth}><input type="hidden" name="id" value={n.id}/><ConfirmSubmit message={id ? 'Hapus snapshot ini?' : 'Delete this snapshot?'}>{id ? 'Hapus' : 'Delete'}</ConfirmSubmit></form>
    </details>)}</div>
  </Shell>;
}
