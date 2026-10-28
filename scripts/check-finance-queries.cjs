const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
let errors = {}, rows = {}, calls = [];
const client = { from(table) {
  const state = { table, start: 0, end: 999, payload: null };
  const query = new Proxy({}, { get(_, key) {
    if (key === 'then') return (resolve, reject) => {
      calls.push({ ...state });
      return Promise.resolve({ data: (rows[table] ?? []).slice(state.start, state.end + 1), error: typeof errors[table] === 'function' ? errors[table](state) : errors[table] ?? null }).then(resolve, reject);
    };
    return (...args) => { if (key === 'order') state.order = args[0]; if (key === 'range') [state.start,state.end] = args; if (key === 'insert' || key === 'update') state.payload = args[0]; return query; };
  }});
  return query;
}};
function load(file, extra) {
  const context = { exports: {}, client, FormData, require: name => name === './finance' ? { monthBounds: () => ({ start:'2026-10-01',end:'2026-10-31',month:'2026-10' }) } : {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions:{module:ts.ModuleKind.CommonJS} }).outputText + extra, context);
  return context.exports;
}
const data = load('src/lib/data.ts', '\nrequireFinanceUser = async () => ({ supabase: client, user: { id: "owner" } });');
const actions = load('src/lib/actions.ts', '\nrequireUser = async () => ({ supabase: client, userId: "owner" }); done = () => {};');
(async () => {
  errors.wallet_balances = { code:'42P01',message:'relation wallet_balances does not exist' };
  rows.wallets = [{ id:'wallet', initial_balance:100 }];
  rows.transactions = Array.from({ length:1001 }, () => ({ wallet_id:'wallet', type:'income', amount:1 }));
  rows.transfers = [{ from_wallet_id:'wallet',to_wallet_id:'other',amount:50 }];
  assert.equal((await data.listWallets())[0].balance, 1051, 'fallback balance must include pages beyond the first 1000 rows');
  errors.wallet_balances = { code:'42501',message:'permission denied for wallet_balances' };
  calls = [];
  await assert.rejects(data.listWallets(), /Unable to load wallets/);
  assert.equal(calls.length, 1, 'permission/offline failures must not activate fallback');
  errors = {}; rows = {};
  for (const table of ['wallet_balances','categories','transactions','transfers','loans','budgets','btc_dca_logs','net_worth_snapshots']) {
    errors[table] = { message:'Offline' };
    await assert.rejects(data.requireFinance('2026-10'), /Unable to load/);
    errors = {};
  }
  errors.btc_dca_logs = state => state.order === 'buy_date' ? { code:'42703',message:'column buy_date does not exist' } : null;
  rows.btc_dca_logs = [{ log_date:'2026-10-22',exchange:'Canonical exchange' }];
  const btc = (await data.requireFinance('2026-10')).btc[0];
  assert.equal(btc.buy_date, '2026-10-22');
  assert.equal(btc.exchange, 'Canonical exchange');
  rows = {};
  const form = new FormData();
  for (const [key,value] of Object.entries({ date:'2026-10-22',fiat_amount:'100',btc_amount:'0.001',exchange:'My exchange' })) form.set(key,value);
  calls = [];
  errors.btc_dca_logs = state => state.payload?.buy_date ? { code:'PGRST204',message:'buy_date missing' } : null;
  await actions.createBtcLog(form);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].payload.log_date, '2026-10-22');
  assert.equal(calls[1].payload.exchange, 'My exchange', 'canonical write must retain exchange');
  errors.btc_dca_logs = { code:'PGRST204',message:'exchange missing' };
  assert.match((await actions.createBtcLog(form)).error, /Database BTC belum diperbarui/);
  errors.btc_dca_logs = { message:'Offline' }; calls = [];
  assert.match((await actions.createBtcLog(form)).error, /Offline/);
  assert.equal(calls.length, 1, 'offline writes must not be retried against another schema');
  console.log('Finance compatibility: paginated balances, narrow schema fallback, preserved BTC exchange, retained errors passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
