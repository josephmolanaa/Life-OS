import { ActionForm } from './action-form';
import { AmountInput } from './amount-input';
import { createWallet } from '@/lib/actions';
import { copy, getLang } from '@/lib/i18n';

export async function WalletForm({ className = 'card form' }: { className?: string } = {}) {
  const lang = await getLang();
  const t = copy[lang];
  return <ActionForm className={className} action={createWallet} lang={lang}>
    <b>{t.newWallet}</b>
    <label><span>{lang === 'id' ? 'Nama dompet' : 'Wallet name'}</span><input className="input" name="name" placeholder="BCA / Gopay / Cash" required/></label>
    <label><span>{lang === 'id' ? 'Jenis' : 'Type'}</span><select className="input" name="type"><option value="cash">{lang === 'id' ? 'Tunai' : 'Cash'}</option><option value="bank">Bank</option><option value="ewallet">E-Wallet</option><option value="crypto">Crypto</option></select></label>
    <label><span>{lang === 'id' ? 'Mata uang' : 'Currency'}</span><input className="input" name="currency" defaultValue="IDR" required minLength={3} maxLength={10} pattern="[A-Za-z]{3,10}"/></label>
    <label><span>{lang === 'id' ? 'Saldo awal' : 'Initial balance'}</span><AmountInput name="initial_balance" placeholder={t.initialBalancePlaceholder}/></label>
    <button className="btn">{t.saveWallet}</button>
  </ActionForm>;
}
