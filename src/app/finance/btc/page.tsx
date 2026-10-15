import { AmountInput } from '@/components/finance/amount-input';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { LocalDateInput } from '@/components/finance/local-date-input';
import { Shell } from '@/components/finance/layout';
import { createBtcLog, deleteBtcLog, updateBtcLog } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { money } from '@/lib/finance';
import { getLang } from '@/lib/i18n';

export default async function Btc({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const data = await requireFinance();
  const id = await getLang() === 'id';
  const totalBtc = data.btc.reduce((sum, item) => sum + Number(item.btc_amount), 0);
  const totalCost = data.btc.reduce((sum, item) => sum + Number(item.fiat_amount) + Number(item.fee_amount), 0);
  const avg = totalBtc > 0 ? totalCost / totalBtc : 0;

  return <Shell title="BTC DCA">
    {params.error && <div className="notice error">{params.error}</div>}
    <div className="grid grid2">
      <div className="card"><div className="muted">Total BTC</div><div className="big">{totalBtc.toFixed(8)}</div></div>
      <div className="card"><div className="muted">{id ? 'Modal total' : 'Cost basis'}</div><div className="big">{money.format(totalCost)}</div></div>
      <div className="card"><div className="muted">{id ? 'Rata-rata beli' : 'Average buy'}</div><div className="big">{money.format(avg)}</div></div>
      <form className="card form" action={createBtcLog}><b>{id ? 'Catat DCA' : 'Log DCA'}</b><LocalDateInput className="input" name="date"/><AmountInput name="fiat_amount" placeholder={id ? 'Nominal fiat, contoh 500.000' : 'Fiat amount, e.g. 500,000'} required/><input className="input" name="btc_amount" type="number" step="0.00000001" placeholder="BTC amount" required/><AmountInput name="fee_amount" placeholder={id ? 'Fee, contoh 5.000' : 'Fee, e.g. 5,000'}/><input className="input" name="exchange" placeholder="Exchange"/><input className="input" name="note" placeholder={id ? 'Catatan' : 'Note'}/><button className="btn">{id ? 'Simpan BTC' : 'Save BTC'}</button></form>
    </div>
    <div className="list sectionGap">{data.btc.map(b => <details className="card loanDetails" key={b.id}>
      <summary className="loanSummary"><span>{b.buy_date}<br/><small className="muted">{b.exchange}</small></span><b>{Number(b.btc_amount).toFixed(8)} BTC</b></summary>
      <form className="form spaced" action={updateBtcLog}>
        <input type="hidden" name="id" value={b.id}/><input className="input" name="date" type="date" defaultValue={b.buy_date}/><AmountInput name="fiat_amount" defaultValue={Number(b.fiat_amount)} required/><input className="input" name="btc_amount" type="number" step="0.00000001" defaultValue={Number(b.btc_amount)} required/><AmountInput name="fee_amount" defaultValue={Number(b.fee_amount)}/><input className="input" name="exchange" defaultValue={b.exchange ?? ''}/><input className="input" name="note" defaultValue={b.note ?? ''}/><button className="btn">{id ? 'Simpan edit' : 'Save changes'}</button>
      </form>
      <form className="spaced" action={deleteBtcLog}><input type="hidden" name="id" value={b.id}/><ConfirmSubmit message={id ? 'Hapus log BTC ini?' : 'Delete this BTC log?'}>{id ? 'Hapus' : 'Delete'}</ConfirmSubmit></form>
    </details>)}</div>
  </Shell>;
}
