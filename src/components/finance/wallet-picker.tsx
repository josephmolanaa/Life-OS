type Wallet = { id: string; name: string };

export function WalletPicker({ wallets, name = 'wallet_id', defaultValue, labelPrefix = 'Wallet' }: { wallets: Wallet[]; name?: string; defaultValue?: string; labelPrefix?: string }) {
  return <label><span>{labelPrefix}</span><select className="input" name={name} required defaultValue={defaultValue ?? wallets[0]?.id ?? ''}>
    {!wallets.length && <option value="">—</option>}
    {wallets.map(wallet => <option key={wallet.id} value={wallet.id}>{wallet.name}</option>)}
  </select></label>;
}

export function TransferWalletPickers({ wallets, fromLabel, toLabel }: { wallets: Wallet[]; fromLabel: string; toLabel: string }) {
  return <><WalletPicker wallets={wallets} name="from_wallet_id" labelPrefix={fromLabel}/><WalletPicker wallets={wallets} name="to_wallet_id" labelPrefix={toLabel} defaultValue={wallets[1]?.id}/></>;
}
