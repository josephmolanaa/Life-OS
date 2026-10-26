const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports = {}) {
  const context = { exports: {}, console, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return context.exports;
}
const finance = load('src/lib/finance.ts');
let lang = 'id';
let data;
let loadedMonth;
const charts = [];
const chart = type => props => { charts.push({ type, ...props }); return React.createElement('div', { 'data-chart': type }); };
const Page = load('src/app/finance/page.tsx', {
  'next/link': { default: ({ children, href, ...props }) => React.createElement('a', { ...props, href }, children) },
  'lucide-react': { ArrowDownLeft: () => null, ArrowUpRight: () => null, ChevronLeft: () => null, ChevronRight: () => null, Plus: () => null, Wallet: () => null },
  '@/components/finance/layout': { Shell: ({ children }) => children },
  '@/components/finance/charts': { ExpensePie: chart('pie'), TrendLine: chart('trend') },
  '@/components/finance/privacy-amount': { PrivacyAmount: ({ value }) => value },
  '@/components/finance/privacy-toggle-button': { PrivacyToggleButton: () => null },
  '@/lib/data': { requireFinance: async month => { loadedMonth = month; return data; } },
  '@/lib/finance': finance,
  '@/lib/i18n': { getLang: async () => lang, copy: { id: { transactionsTitle: 'Transaksi', walletsTitle: 'Dompet', reportsTitle: 'Laporan', settingsTitle: 'Pengaturan', createWallet: 'Buat dompet', wallet: 'Dompet', income: 'Pemasukan', expense: 'Pengeluaran', savingRate: 'Rasio menabung', viewAll: 'Lihat semua', trackNetWorth: 'Kekayaan bersih', trackBtcDca: 'BTC DCA' }, en: { transactionsTitle: 'Transactions', walletsTitle: 'Wallets', reportsTitle: 'Reports', settingsTitle: 'Settings', createWallet: 'Create wallet', wallet: 'Wallet', income: 'Income', expense: 'Expense', savingRate: 'Saving rate', viewAll: 'View all', trackNetWorth: 'Net worth', trackBtcDca: 'BTC DCA' } } },
}).default;
async function render(params) { charts.length = 0; return renderToStaticMarkup(await Page({ searchParams: Promise.resolve(params) })); }
(async () => {
  data = { wallets: [{ id: 'idr', name: 'Bank', currency: 'IDR', balance: 2000 }, { id: 'usd', name: 'Dollar', currency: 'USD', balance: 300 }], categories: [{}], transactions: [
    { id: 'income', wallet_id: 'idr', type: 'income', amount: 1000, transaction_date: '2026-10-08', note: 'Gaji', categories: { name: 'Kerja' } },
    ...Array.from({ length: 7 }, (_, i) => ({ id: `tx${i}`, wallet_id: 'idr', category_id: `cat${i}`, type: 'expense', amount: 10, transaction_date: '2026-10-03', categories: { name: `Kategori ${i}` } })),
    { id: 'foreign', wallet_id: 'usd', type: 'expense', amount: 99, transaction_date: '2026-10-03' },
  ], budgets: [{ id: 'budget', category_id: 'cat0', amount: 5, categories: { name: 'Makan' } }], netWorth: [{ snapshot_date: '2026-10-05', assets_amount: 1000, liabilities_amount: 200, net_worth_amount: 0 }] };
  let html = await render({ month: '2026-10' });
  assert.equal(loadedMonth, '2026-10');
  assert.ok(html.includes(finance.formatMoney(930)), 'income minus all IDR expenses');
  assert.ok(html.includes(finance.formatMoney(2000)), 'wallet balance excludes USD');
  assert.match(html, /200%/);
  assert.match(html, /Melebihi anggaran/);
  assert.match(html, /Gaji/);
  assert.match(html, /2026-09/);
  assert.match(html, /2026-11/);
  assert.equal(charts.find(x => x.type === 'pie').data.reduce((sum, x) => sum + x.value, 0), 70, 'other categories retained');
  assert.equal(charts.find(x => x.type === 'pie').data.length, 6);
  assert.equal(charts.find(x => x.type === 'trend').data.at(-1).value, 930);
  assert.equal(charts.at(-1).data[0].value, 800, 'snapshot calculated from assets minus liabilities');
  assert.doesNotMatch(html, /wallets\/new/);
  lang = 'en';
  html = await render({ month: '2026-10', currency: 'USD' });
  assert.match(html, /Cash flow trend/);
  assert.ok(html.includes(finance.formatMoney(-99, 'USD')));
  assert.match(html, /Budgets use IDR/);
  assert.doesNotMatch(html, /Gaji/);
  data = { wallets: [], categories: [], transactions: [], budgets: [], netWorth: [] };
  html = await render({ month: ['invalid', '2026-10'], currency: ['USD'] });
  assert.equal(loadedMonth, finance.monthBounds().month, 'repeated/invalid query falls back safely');
  assert.match(html, /Start with your first wallet/);
  assert.equal(charts.length, 0, 'empty state does not invent history');
  const hiddenCharts = load('src/components/finance/charts.tsx', {
    recharts: {}, '@/lib/finance': finance, '@/components/finance/privacy-context': { usePrivacy: () => ({ hidden: true }) },
  });
  for (const name of ['CashflowChart', 'ExpensePie', 'TrendLine']) {
    const hidden = renderToStaticMarkup(React.createElement(hiddenCharts[name], { data: [{ name: 'secret', value: 987654321 }] }));
    assert.doesNotMatch(hidden, /987654321|secret/);
    assert.match(hidden, /Chart values hidden/);
  }
  console.log('Finance dashboard: totals, currencies, category remainder, budget overspend, snapshots, invalid queries, onboarding, and chart privacy passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
