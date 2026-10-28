const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(file, imports) {
  const context = { exports: {}, FormData, require: name => imports[name] ?? require(name) };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return context.exports;
}
let databaseError = { message: 'Write failed' };
let saved;
const client = { auth: { getUser: async () => ({ data: { user: { id: 'owner' } } }) }, from: () => ({ insert: async payload => { saved = payload; return { error: databaseError }; }, update: payload => { saved = payload; const query = { eq: () => query, then: (resolve, reject) => Promise.resolve({ error: databaseError }).then(resolve, reject) }; return query; } }) };
const actions = load('src/lib/actions.ts', {
  'next/cache': { revalidatePath() {} },
  'next/navigation': { redirect(path) { throw Object.assign(new Error(path), { digest: 'NEXT_REDIRECT' }); } },
  './supabase/server': { createClient: async () => client },
});
(async () => {
  const form = new FormData();
  Object.entries({ type: 'expense', wallet_id: 'wallet', category_id: 'category', date: '2026-10-22', amount: '1000', note: 'Full description' }).forEach(([key,value]) => form.set(key,value));
  const failure = await actions.createTransaction(form);
  assert.equal(failure.error, 'Write failed');
  assert.equal(form.get('note'), 'Full description');
  const walletForm = new FormData();
  Object.entries({ id: 'wallet', name: 'Edited bank', type: 'bank', currency: 'IDR', initial_balance: '100' }).forEach(([key,value]) => walletForm.set(key,value));
  assert.equal((await actions.updateWallet(walletForm)).error, 'Write failed');
  assert.equal(walletForm.get('name'), 'Edited bank');
  const btcForm = new FormData();
  Object.entries({ date: '2026-10-22', fiat_amount: '500000', btc_amount: '0.0001', note: 'Keep BTC draft' }).forEach(([key,value]) => btcForm.set(key,value));
  assert.equal((await actions.createBtcLog(btcForm)).error, 'Write failed');
  assert.equal(btcForm.get('note'), 'Keep BTC draft');
  databaseError = null;
  await assert.rejects(actions.createTransaction(form), /\/finance\/transactions/);
  assert.equal(saved.note, 'Full description');
  assert.equal(saved.user_id, 'owner');
  assert.equal(saved.amount, 1000);
  const invalidWallet = new FormData();
  Object.entries({ name: 'Bank', type: 'bank', currency: '<bad>' }).forEach(([key,value]) => invalidWallet.set(key,value));
  assert.match((await actions.createWallet(invalidWallet)).error, /Currency/);
  const wallets = load('src/components/finance/wallet-picker.tsx', {});
  const walletMarkup = renderToStaticMarkup(React.createElement(wallets.TransferWalletPickers, { wallets: [{id:'a',name:'A'},{id:'b',name:'B'}], fromLabel:'From', toLabel:'To' }));
  assert.equal((walletMarkup.match(/<select/g) ?? []).length, 2);
  assert.match(walletMarkup, /value="b" selected/);
  const categories = load('src/components/finance/transaction-title-picker.tsx', {});
  const markup = renderToStaticMarkup(React.createElement(categories.TransactionTitlePicker, { categories: Array.from({length:12},(_,i)=>({id:String(i),name:`Category ${i}`})), placeholder: 'Description' }));
  assert.equal((markup.match(/<option/g) ?? []).length, 13);
  assert.match(markup, /No category/);
  assert.equal((markup.match(/name="note"/g) ?? []).length, 1);
  console.log('Finance UX: failed writes retain form; payload saves description; all categories and native wallet controls available.');
})().catch(error => { console.error(error); process.exitCode = 1; });
