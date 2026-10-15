import Link from 'next/link';
import { Bitcoin, DatabaseBackup, Landmark, Tags, TrendingUp, WalletCards } from 'lucide-react';
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
  const incomeCategories = data.categories.filter((category) => category.type === 'income');
  const expenseCategories = data.categories.filter((category) => category.type === 'expense');
  const hasDefaults = data.wallets.length > 0 && data.categories.length > 0;

  return <Shell title={t.settingsTitle}>
    <div className="settingsPage">
      {params.error && <div className="notice error">{params.error}</div>}

      <div className="settingsOverview">
        <form className="card form settingsSetup" action={seedDefaults}>
          <div className="settingsCardHeader">
            <div>
              <span className="pill">{t.setupInitial}</span>
              <h2>{hasDefaults ? t.basicsReady : t.startHere}</h2>
              <p className="muted noMargin">{t.setupHelp}</p>
            </div>
          </div>
          <div className="settingsStats">
            <span><strong>{data.wallets.length}</strong>{t.walletCount}</span>
            <span><strong>{data.categories.length}</strong>{t.categoryCount}</span>
          </div>
          <button className="btn settingsPrimaryAction">{hasDefaults ? t.updateDefaults : t.createDefaults}</button>
        </form>

        <section className="card settingsShortcuts">
          <div className="settingsCardHeader">
            <div>
              <span className="pill">{t.manageFeatures}</span>
              <h2>{t.commonSettings}</h2>
              <p className="muted noMargin">{t.commonSettingsHelp}</p>
            </div>
          </div>
          <div className="settingsLinkGrid">
            <SettingsLink href="/finance/wallets" label={t.settingsManageWallet} Icon={WalletCards} />
            <SettingsLink href="/finance/budgets" label={t.setMonthlyBudget} Icon={TrendingUp} />
            <SettingsLink href="/finance/btc" label={t.trackBtcDca} Icon={Bitcoin} />
            <SettingsLink href="/finance/net-worth" label={t.trackNetWorth} Icon={Landmark} />
          </div>
        </section>
      </div>

      <section className="card settingsSection">
        <div className="settingsSectionHeader">
          <div>
            <span className="pill">{id ? 'Kategori custom' : 'Custom category'}</span>
            <h2>{id ? 'Tambah kategori' : 'Add category'}</h2>
            <p className="muted noMargin">{id ? 'Buat kategori agar transaksi lebih mudah dibaca.' : 'Create a category to keep transactions easier to scan.'}</p>
          </div>
          <Tags size={22} aria-hidden="true" />
        </div>
        <form className="settingsCreateForm" action={createCategory}>
          <label className="settingsField" htmlFor="category-name">
            <span>{id ? 'Nama kategori' : 'Category name'}</span>
            <input id="category-name" className="input" name="name" placeholder={id ? 'Contoh: Liburan' : 'Example: Travel'} required />
          </label>
          <label className="settingsField" htmlFor="category-type">
            <span>{id ? 'Tipe' : 'Type'}</span>
            <select id="category-type" className="input" name="type" defaultValue="expense"><option value="expense">Expense</option><option value="income">Income</option></select>
          </label>
          <label className="settingsField settingsColorField" htmlFor="category-color">
            <span>{id ? 'Warna' : 'Color'}</span>
            <input id="category-color" className="input colorInput" name="color" type="color" defaultValue="#64748b" />
          </label>
          <input type="hidden" name="icon" value="circle" />
          <button className="btn settingsCreateButton">{id ? 'Simpan kategori' : 'Save category'}</button>
        </form>
      </section>

      <section className="card settingsSection">
        <div className="settingsSectionHeader">
          <div>
            <span className="pill">{data.categories.length} {t.total}</span>
            <h2>{t.transactionCategories}</h2>
            <p className="muted noMargin">{t.categoriesHelp}</p>
          </div>
        </div>
        {data.categories.length === 0 ? <div className="empty settingsEmpty"><b>{t.noCategories}</b><p className="muted noMargin">{t.noCategoriesHelp}</p></div> : <div className="settingsCategories">
          <CategoryGroup title={id ? 'Pemasukan' : 'Income'} categories={incomeCategories} deleteLabel={t.delete} saveLabel={t.save} emptyLabel={t.noCategories} confirm={id ? 'Hapus kategori ini?' : 'Delete this category?'} />
          <CategoryGroup title={id ? 'Pengeluaran' : 'Expense'} categories={expenseCategories} deleteLabel={t.delete} saveLabel={t.save} emptyLabel={t.noCategories} confirm={id ? 'Hapus kategori ini?' : 'Delete this category?'} />
        </div>}
      </section>

      <section className="card settingsDataCard">
        <div className="settingsSectionHeader">
          <div>
            <span className="pill">{t.dataSection}</span>
            <h2>{t.exportBackup}</h2>
            <p className="muted noMargin">{id ? 'Download CSV untuk backup manual transaksi finance.' : 'Download a CSV copy of your finance data for a manual backup.'}</p>
          </div>
          <DatabaseBackup size={22} aria-hidden="true" />
        </div>
        <Link className="btn ghost settingsExportButton" href="/finance/settings/export">{id ? 'Download backup CSV' : 'Download CSV backup'}</Link>
      </section>
    </div>
  </Shell>;
}

function SettingsLink({ href, label, Icon }: { href: string; label: string; Icon: typeof WalletCards }) {
  return <Link className="settingsLink" href={href}>
    <Icon size={19} aria-hidden="true" />
    <span>{label}</span>
  </Link>;
}

function CategoryGroup({ title, categories, deleteLabel, saveLabel, emptyLabel, confirm }: { title: string; categories: { id: string; name: string; type: 'income' | 'expense'; color: string; icon: string }[]; deleteLabel: string; saveLabel: string; emptyLabel: string; confirm: string }) {
  return <section className="settingsGroup">
    <div className="settingsGroupHeader"><b>{title}</b><span className="pill">{categories.length}</span></div>
    {categories.length === 0 ? <p className="muted noMargin">{emptyLabel}</p> : <div className="list settingsCategoryList">{categories.map((category) => <div className="item categoryEditItem" key={category.id}>
      <form className="categoryEditForm" action={updateCategory}>
        <input type="hidden" name="id" value={category.id} />
        <select className="input compactInput" name="type" defaultValue={category.type} aria-label={`${category.name} type`}><option value="income">Income</option><option value="expense">Expense</option></select>
        <input className="input" name="name" defaultValue={category.name} aria-label={`${category.name} name`} required />
        <input className="input colorInput" name="color" type="color" defaultValue={category.color} aria-label={`${category.name} color`} />
        <input type="hidden" name="icon" value={category.icon || 'circle'} />
        <button className="btn ghost" aria-label={`${saveLabel} ${category.name}`}>{saveLabel}</button>
      </form>
      <form action={deleteCategory}><input type="hidden" name="id" value={category.id} /><ConfirmSubmit message={confirm} className="btn danger" ariaLabel={`${deleteLabel} ${category.name}`}>{deleteLabel}</ConfirmSubmit></form>
    </div>)}</div>}
  </section>;
}
