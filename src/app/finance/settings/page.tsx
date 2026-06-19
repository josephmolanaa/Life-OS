import Link from 'next/link';
import { Shell } from '@/components/finance/layout';
import { ConfirmSubmit } from '@/components/finance/confirm-submit';
import { createCategory, deleteCategory, seedDefaults, updateCategory } from '@/lib/actions';
import { requireFinance } from '@/lib/data';
import { copy, getLang } from '@/lib/i18n';

export default async function Settings({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const data = await requireFinance();
  const lang = await getLang();
  const t = copy[lang];
  const id = lang === 'id';
  const incomeCategories = data.categories.filter(c => c.type === 'income');
  const expenseCategories = data.categories.filter(c => c.type === 'expense');
  const hasDefaults = data.wallets.length > 0 && data.categories.length > 0;

  return <Shell title={t.settingsTitle}>
    <div className="grid settingsStack">
      {params.error && <div className="notice error">{params.error}</div>}
      <form className="card form" action={seedDefaults}>
        <span className="pill">{t.setupInitial}</span>
        <b>{hasDefaults ? t.basicsReady : t.startHere}</b>
        <p className="muted noMargin">{t.setupHelp}</p>
        <div className="settingsStats"><span>{data.wallets.length} {t.walletCount}</span><span>{data.categories.length} {t.categoryCount}</span></div>
        <button className="btn">{hasDefaults ? t.updateDefaults : t.createDefaults}</button>
      </form>

      <div className="card form">
        <span className="pill">{t.manageFeatures}</span>
        <b>{t.commonSettings}</b>
        <p className="muted noMargin">{t.commonSettingsHelp}</p>
        <Link className="btn ghost" href="/finance/wallets">{t.settingsManageWallet}</Link>
        <Link className="btn ghost" href="/finance/budgets">{t.setMonthlyBudget}</Link>
        <Link className="btn ghost" href="/finance/btc">{t.trackBtcDca}</Link>
        <Link className="btn ghost" href="/finance/net-worth">{t.trackNetWorth}</Link>
      </div>

      <form className="card form" action={createCategory}>
        <span className="pill">{id ? 'Kategori custom' : 'Custom category'}</span>
        <b>{id ? 'Tambah kategori' : 'Add category'}</b>
        <input className="input" name="name" placeholder={id ? 'Nama kategori' : 'Category name'} required />
        <select className="input" name="type"><option value="expense">Expense</option><option value="income">Income</option></select>
        <input className="input" name="color" type="color" defaultValue="#64748b" />
        <input className="input" name="icon" placeholder="circle" defaultValue="circle" />
        <button className="btn">{id ? 'Simpan kategori' : 'Save category'}</button>
      </form>

      <div className="card">
        <div className="row"><div><b>{t.transactionCategories}</b><p className="muted noMargin">{t.categoriesHelp}</p></div><span className="pill">{data.categories.length} {t.total}</span></div>
        {data.categories.length === 0 ? <div className="empty spaced"><b>{t.noCategories}</b><p className="muted noMargin">{t.noCategoriesHelp}</p></div> : <div className="grid grid2 spaced">
          <CategoryGroup title="Income" categories={incomeCategories} deleteLabel={t.delete} confirm={id ? 'Hapus kategori ini?' : 'Delete this category?'} />
          <CategoryGroup title="Expense" categories={expenseCategories} deleteLabel={t.delete} confirm={id ? 'Hapus kategori ini?' : 'Delete this category?'} />
        </div>}
      </div>

      <div className="card form">
        <span className="pill">{t.dataSection}</span>
        <b>{t.exportBackup}</b>
        <p className="muted noMargin">{id ? 'Export data finance ke CSV untuk backup manual.' : 'Export finance data to CSV for a manual backup.'}</p>
        <Link className="btn ghost" href="/finance/settings/export">{id ? 'Download backup CSV' : 'Download CSV backup'}</Link>
      </div>
    </div>
  </Shell>;
}

function CategoryGroup({ title, categories, deleteLabel, confirm }: { title: string; categories: { id: string; name: string; type: 'income' | 'expense'; color: string; icon: string }[]; deleteLabel: string; confirm: string }) {
  return <div className="settingsGroup"><b>{title}</b><div className="list spaced">{categories.map(category => <div className="item categoryEditItem" key={category.id}>
    <form className="categoryEditForm" action={updateCategory}>
      <input type="hidden" name="id" value={category.id}/>
      <select className="input compactInput" name="type" defaultValue={category.type}><option value="income">Income</option><option value="expense">Expense</option></select>
      <input className="input" name="name" defaultValue={category.name} required />
      <input className="input colorInput" name="color" type="color" defaultValue={category.color}/>
      <input type="hidden" name="icon" value={category.icon || 'circle'}/>
      <button className="btn ghost">Save</button>
    </form>
    <form action={deleteCategory}><input type="hidden" name="id" value={category.id}/><ConfirmSubmit message={confirm}>{deleteLabel}</ConfirmSubmit></form>
  </div>)}</div></div>;
}

