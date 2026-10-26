import { ActionForm } from '@/components/finance/action-form';
import { AmountInput } from '@/components/finance/amount-input';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { LocalDateInput } from '@/components/finance/local-date-input';
import { Shell } from '@/components/finance/layout';
import Link from 'next/link';
import { createLoan, deleteLoan, settleLoan, updateLoan } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { money } from '@/lib/finance';
import { getLang } from '@/lib/i18n';

export default async function Loans({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const data = await requireFinance();
  const id = await getLang() === 'id';
  const receivable = data.loans.filter(l => l.direction === 'give' && l.status === 'open').reduce((sum, loan) => sum + Number(loan.amount), 0);
  const payable = data.loans.filter(l => l.direction === 'get' && l.status === 'open').reduce((sum, loan) => sum + Number(loan.amount), 0);

  return <Shell title={id ? 'Utang / Piutang' : 'Loan / Give / Get'}>
    <div className="editPageNav"><Link className="btn ghost" href="/finance">{String.fromCodePoint(8592)} {id ? 'Kembali ke Finance' : 'Back to Finance'}</Link></div>
    {params.error && <div className="notice error">{params.error}</div>}
    <div className="grid grid2">
      <div className="card"><div className="muted">{id ? 'Piutang' : 'Receivable'}</div><div className="big positive">{money.format(receivable)}</div></div>
      <div className="card"><div className="muted">{id ? 'Utang' : 'Payable'}</div><div className="big negative">{money.format(payable)}</div></div>
      <ActionForm className="card form" action={createLoan}>
        <b>{id ? 'Catat utang/piutang' : 'Record loan'}</b>
        <select className="input" name="direction"><option value="give">{id ? 'Give - piutang' : 'Give - receivable'}</option><option value="get">{id ? 'Get - utang' : 'Get - payable'}</option></select>
        <input className="input" name="person_name" placeholder={id ? 'Nama orang' : 'Person name'} required/>
        <AmountInput name="amount" placeholder={id ? 'Jumlah, contoh 100.000' : 'Amount, e.g. 100,000'} required/>
        <LocalDateInput className="input" name="date"/>
        <input className="input" name="due_date" type="date"/>
        <select className="input" name="wallet_id" required>{data.wallets.filter(w => !w.is_archived).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <input className="input" name="note" placeholder={id ? 'Catatan' : 'Note'}/>
        <button className="btn">{id ? 'Simpan' : 'Save'}</button>
      </ActionForm>
    </div>
    <div className="list sectionGap">{data.loans.map(l => <details className="card loanDetails" key={l.id}>
      <summary className="loanSummary"><span>{l.direction.toUpperCase()} - {l.person_name}<br/><small className="muted">{l.loan_date} - {l.status}</small></span><b>{money.format(Number(l.amount))}</b></summary>
      <ActionForm className="form spaced" action={updateLoan}>
        <input type="hidden" name="id" value={l.id}/>
        <select className="input" name="direction" defaultValue={l.direction}><option value="give">Give</option><option value="get">Get</option></select>
        <input className="input" name="person_name" defaultValue={l.person_name} required/>
        <AmountInput name="amount" defaultValue={Number(l.amount)} required/>
        <input className="input" name="date" type="date" defaultValue={l.loan_date}/>
        <input className="input" name="due_date" type="date" defaultValue={l.due_date ?? ''}/>
        <select className="input" name="wallet_id" defaultValue={l.wallet_id} required>{data.wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <select className="input" name="status" defaultValue={l.status}><option value="open">Open</option><option value="settled">Settled</option><option value="cancelled">Cancelled</option></select>
        <input className="input" name="note" defaultValue={l.note ?? ''}/>
        <div className="actionRow"><button className="btn">{id ? 'Simpan edit' : 'Save changes'}</button></div>
      </ActionForm>
      <div className="actionRow spaced">
        {l.status === 'open' && <form action={settleLoan}><input type="hidden" name="id" value={l.id}/><button className="btn ghost">{id ? 'Selesai' : 'Settled'}</button></form>}
        <form action={deleteLoan}><input type="hidden" name="id" value={l.id}/><ConfirmSubmit message={id ? 'Hapus utang/piutang ini?' : 'Delete this loan?'}>{id ? 'Hapus' : 'Delete'}</ConfirmSubmit></form>
      </div>
    </details>)}</div>
  </Shell>;
}
