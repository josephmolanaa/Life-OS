import { AmountInput } from './amount-input';
import { createWallet } from '@/lib/actions';
import { copy, getLang } from '@/lib/i18n';

export async function WalletForm({ className = 'card form' }: { className?: string } = {}) {
  const t = copy[await getLang()];
  return <form className={className} action={createWallet}><b>{t.newWallet}</b><input className="input" name="name" placeholder="BCA / Gopay / Cash" required/><select className="input" name="type"><option value="cash">Cash</option><option value="bank">Bank</option><option value="ewallet">E-Wallet</option><option value="crypto">Crypto</option></select><input className="input" name="currency" defaultValue="IDR"/><AmountInput name="initial_balance" placeholder={t.initialBalancePlaceholder}/><button className="btn">{t.saveWallet}</button></form>;
}