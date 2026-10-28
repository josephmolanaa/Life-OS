import type { CSSProperties } from 'react';

export type FinanceLoadingVariant =
  | 'wallets'
  | 'transactions'
  | 'budgets'
  | 'net-worth'
  | 'btc'
  | 'activity'
  | 'finance-settings';

function Line({ width = '100%', height = 18, style }: { width?: CSSProperties['width']; height?: CSSProperties['height']; style?: CSSProperties }) {
  return <span className="loadingLine" style={{ width, maxWidth: '100%', minWidth: 0, height, flexShrink: 0, ...style }} />;
}

function Field({ width = '100%' }: { width?: CSSProperties['width'] }) {
  return <Line width={width} height={43} style={{ borderRadius: 9 }} />;
}

function FormFields({ count }: { count: number }) {
  return <>{Array.from({ length: count }, (_, index) => <Field key={index} />)}</>;
}

function Rows({ count = 3, actions = false, details = false }: { count?: number; actions?: boolean; details?: boolean }) {
  return <div className="list sectionGap">{Array.from({ length: count }, (_, index) => <div className={details ? 'card loanDetails' : 'item transactionItem'} style={{ minWidth: 0 }} key={index}><div className={details ? 'loanSummary' : undefined} style={details ? undefined : { display: 'contents' }}>
    <span className="transactionInfo"><Line width="62%" height={20} /><Line width="46%" height={16} style={{ marginTop: 6 }} /></span>
    <b className="transactionAmount"><Line width={110} height={22} /></b>
    {actions && <span className="transactionActions"><Line width={74} height={34} /></span>}
  </div></div>)}</div>;
}

function WalletsLoading() {
  return <>
    <div className="grid grid2"><div className="card summary balanceSummary"><Line width={120} height={16} /><Line width="62%" height={32} style={{ marginTop: 14 }} /></div><div className="card form desktopWalletForm"><Line width={120} height={21} /><FormFields count={4} /><Line height={39} /></div></div>
    <Rows />
  </>;
}

function TransactionsLoading() {
  return <>
    <div className="editPageNav transactionPageNav loadingActionRow"><Line width={142} height={40} style={{ borderRadius: 9 }} /><Line width={158} height={40} style={{ borderRadius: 9 }} /></div>
    <div className="daySwitcher"><Line width={44} height={44} style={{ borderRadius: 999 }} /><div className="dayPicker" style={{ minWidth: 0 }}><Field width="min(150px, 38vw)" /><Line width="min(190px, 48vw)" height={39} /></div><Line width={44} height={44} style={{ borderRadius: 999 }} /></div>
    <div className="daySummary card">{Array.from({ length: 3 }, (_, index) => <div key={index}><Line width={70} height={16} /><Line width={100} height={20} /></div>)}</div>
    <div className="reportTabs">{[0, 1, 2].map(index => <div className="reportTab" key={index}><Line width="64%" height={21} /></div>)}</div>
    <div className="list transactionList sectionGap">{Array.from({ length: 4 }, (_, index) => <div className="item transactionItem" key={index}><span className="transactionInfo"><Line width="62%" height={20} /><Line width="74%" height={16} style={{ marginTop: 6 }} /></span><Line width={110} height={22} /><Line width={22} height={22} /></div>)}</div>
  </>;
}

function BudgetsLoading() {
  return <>
    <div className="card form"><Line width={140} height={21} /><FormFields count={3} /><Line height={39} /></div>
    <Rows count={3} actions />
  </>;
}

function NetWorthLoading() {
  return <>
    <div className="grid grid2"><div className="card"><Line width={140} height={16} /><Line width="60%" height={32} style={{ marginTop: 14 }} /></div><div className="card form"><Line width={145} height={21} /><FormFields count={4} /><Line height={39} /></div></div>
    <div className="card sectionGap"><Line width={70} height={21} /><Line height={240} /></div>
    <Rows count={3} details />
  </>;
}

function BtcLoading() {
  return <>
    <div className="grid grid2">
      {Array.from({ length: 3 }, (_, index) => <div className="card" key={index}><Line width={100} height={16} /><Line width="58%" height={32} style={{ marginTop: 14 }} /></div>)}
      <div className="card form"><Line width={95} height={21} /><FormFields count={6} /><Line height={39} /></div>
    </div>
    <Rows count={3} details />
  </>;
}

function ActivityLoading() {
  return <div style={{ display: 'grid', gap: 24 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, minWidth: 0 }}><div className="daySwitcher" style={{ margin: 0, minWidth: 0 }}><Line width={44} height={44} style={{ borderRadius: 999 }} /><Field width="min(150px, 40vw)" /><Line width={44} height={44} style={{ borderRadius: 999 }} /></div><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{Array.from({ length: 4 }, (_, index) => <Line key={index} width={54} height={35} style={{ borderRadius: 999 }} />)}</div></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>{Array.from({ length: 4 }, (_, index) => <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 16 }} key={index}><Line width={52} height={52} /><div style={{ flex: 1 }}><Line width="70%" height={15} /><Line width="55%" height={24} style={{ marginTop: 8 }} /></div></div>)}</div>
    <div className="dashboard-grid"><div style={{ display: 'grid', gap: 24, alignContent: 'start', minWidth: 0 }}><div className="card"><Line width={160} height={24} /><Line height={80} style={{ marginTop: 16 }} /></div><div className="card"><Line width={140} height={24} /><Rows count={3} /></div><div className="card"><Line width={170} height={24} /><Rows count={3} /></div></div><div style={{ display: 'grid', gap: 24, alignContent: 'start', minWidth: 0 }}><div className="card"><Line width={170} height={24} /><Rows count={5} /></div><div className="card"><Line width={120} height={24} /><FormFields count={2} /><Line height={39} /></div></div></div>
  </div>;
}

function FinanceSettingsLoading() {
  return <div className="settingsPage">
    <div className="settingsOverview"><div className="card form settingsSetup"><div className="settingsCardHeader"><div><Line width={120} height={30} /><Line width="70%" height={28} style={{ marginTop: 12 }} /><Line width="90%" height={18} style={{ marginTop: 8 }} /></div></div><div className="settingsStats"><Line width={90} height={31} /><Line width={110} height={31} /></div><Line height={39} /></div><section className="card settingsShortcuts"><Line width={140} height={30} /><Line width="55%" height={28} style={{ marginTop: 12 }} /><div className="settingsLinkGrid sectionGap">{Array.from({ length: 4 }, (_, index) => <Line key={index} height={54} style={{ borderRadius: 14 }} />)}</div></section></div>
    <section className="card settingsSection"><div className="settingsSectionHeader"><div><Line width={125} height={30} /><Line width="45%" height={28} style={{ marginTop: 12 }} /><Line width="70%" height={18} style={{ marginTop: 8 }} /></div><Line width={22} height={22} /></div><div className="settingsCreateForm"><Field /><Field /><Field width={80} /><Line height={39} /></div></section>
    <section className="card settingsSection"><div className="settingsSectionHeader"><div><Line width={90} height={30} /><Line width="45%" height={28} style={{ marginTop: 12 }} /></div></div><div className="settingsCategories">{[0, 1].map(group => <section className="settingsGroup" key={group}><div className="settingsGroupHeader"><Line width={100} height={21} /><Line width={40} height={30} /></div><Rows count={2} actions /></section>)}</div></section>
    <section className="card settingsDataCard"><div className="settingsSectionHeader"><div><Line width={95} height={30} /><Line width="40%" height={28} style={{ marginTop: 12 }} /><Line width="70%" height={18} style={{ marginTop: 8 }} /></div><Line width={22} height={22} /></div><Line width={160} height={39} /></section>
  </div>;
}

export function FinanceModuleLoading({ variant }: { variant: FinanceLoadingVariant }) {
  const content = (() => {
    switch (variant) {
      case 'wallets': return <WalletsLoading />;
      case 'transactions': return <TransactionsLoading />;
      case 'budgets': return <BudgetsLoading />;
      case 'net-worth': return <NetWorthLoading />;
      case 'btc': return <BtcLoading />;
      case 'activity': return <ActivityLoading />;
      case 'finance-settings': return <FinanceSettingsLoading />;
    }
  })();
  if (variant === 'transactions') return content;
  return <><div className="loadingBackLink" aria-hidden="true"><Line width={142} height={40} style={{ borderRadius: 9 }} /></div>{content}</>;
}
