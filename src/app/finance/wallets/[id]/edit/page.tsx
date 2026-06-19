import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AmountInput } from '@/components/finance/amount-input';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { Shell } from '@/components/finance/layout';
import { updateWallet, deleteWallet } from '@/lib/actions';
import { getWallet } from '@/lib/data';
import { copy, getLang } from '@/lib/i18n';

export default async function EditWalletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getLang();
  const t = copy[lang];
  const w = await getWallet(id);
  if (!w) notFound();

  return <Shell title={lang === 'id' ? 'Edit wallet' : 'Edit wallet'} quickFab={false}>
    <div className="editPageNav">
      <Link className="btn ghost" href="/finance/wallets">{String.fromCodePoint(8592)} {lang === 'id' ? 'Kembali' : 'Back'}</Link>
      <form action={deleteWallet}><input type="hidden" name="id" value={w.id}/><ConfirmSubmit message={lang === 'id' ? 'Hapus wallet ini?' : 'Delete this wallet?'}>{t.delete}</ConfirmSubmit></form>
    </div>
    <form className="card form editTransactionPageForm" action={updateWallet}>
      <input type="hidden" name="id" value={w.id}/>
      <b>{lang === 'id' ? 'Nama wallet' : 'Wallet name'}</b>
      <input className="input" name="name" defaultValue={w.name} required/>
      <select className="input" name="type" defaultValue={w.type}>
        <option value="cash">Cash</option>
        <option value="bank">Bank</option>
        <option value="ewallet">E-Wallet</option>
        <option value="crypto">Crypto</option>
      </select>
      <input className="input" name="currency" defaultValue={w.currency}/>
      <AmountInput name="initial_balance" placeholder={t.initialBalancePlaceholder} defaultValue={Number(w.initial_balance)}/>
      <button className="btn">{t.saveEdit}</button>
    </form>
  </Shell>;
}

