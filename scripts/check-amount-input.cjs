const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const context = { exports: {}, require };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/finance/amount-input.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, context);
const parse = context.exports.parseAmountInput;
for (const [input, decimals, expected] of [
  ['1.000.000', false, '1000000'], ['1,000,000', false, '1000000'],
  ['1000', false, '1000'], ['1.234,56', true, '1234.56'],
  ['123.45', true, '123.45'], ['0,00000001', true, '0.00000001'],
  ['0.001', true, '0.001'],
  ['-100', false, null], ['1e3', false, null], ['abc12', false, null],
  ['12,34', false, null], ['1.23.456', false, null],
]) assert.equal(parse(input, decimals), expected, input);
const markup = renderToStaticMarkup(React.createElement(context.exports.AmountInput, { name: 'amount', defaultValue: 123.45 }));
assert.match(markup, /value="123\.45"/);
assert.match(markup, /value="123,45"/);
// Run actual component handlers with a tiny persistent hook state, including rerenders.
const states = [];
let hookIndex = 0;
const interactive = { exports: {}, require: name => name === 'react' ? {
  useState(initial) {
    const index = hookIndex++;
    if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
    return [states[index], value => { states[index] = value; }];
  },
} : require(name) };
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/components/finance/amount-input.tsx', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText, interactive);
const render = () => { hookIndex = 0; return interactive.exports.AmountInput({ name: 'amount' }).props.children; };
let inputs = render();
inputs[1].props.onFocus();
for (const character of '123456') {
  inputs = render();
  const target = { value: inputs[1].props.value + character, setCustomValidity: message => assert.equal(message, '') };
  inputs[1].props.onChange({ currentTarget: target });
}
inputs = render();
assert.equal(inputs[0].props.value, '123456');
assert.equal(inputs[1].props.value, '123456');
inputs[1].props.onBlur();
assert.equal(render()[1].props.value, '123.456');
render()[1].props.onFocus();
assert.equal(render()[1].props.value, '123456');
console.log('Amount input: Indonesian grouping, decimals, invalid paste and negatives OK');
