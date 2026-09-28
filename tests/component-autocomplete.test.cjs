'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const autocomplete = require('../public/component-autocomplete.js');
const {registry} = require('../public/component-preview.js');
const entries = autocomplete.catalog(registry);
const entry = type => entries.find(item => item.type === type);
const ctx = (text, caret = text.length, force = false) => autocomplete.context(text, caret, caret, entries, force);

test('every registered component is listed exactly once; no separate inventory', () => {
  assert.equal(entries.length, Object.keys(registry).length);
  assert.equal(new Set(entries.map(item => item.type)).size, entries.length);
});
for (const item of entries) {
  test(`${item.type}: insertion is a supported alias and searchable`, () => {
    assert.ok(registry[item.type].aliases.includes(item.insert));
    assert.ok(autocomplete.matches(entries, item.insert).some(result => result.type === item.type));
  });
}
for (const [query, expected] of [['bu','Button'],['check','Checkbox'],['drop','Select'],['date p','DatePicker'],['text i','Input'],['radio','Radio'],['toast','Alert'],['chip','Badge'],['SWITCH','Switch'],['drop-down','Select'],['DatePicker','DatePicker']]) {
  test(`search ${query}`, () => assert.ok(autocomplete.matches(entries, query).some(item => item.type === expected)));
}
test('unknown query returns no component, not a workflow', () => assert.deepEqual(autocomplete.matches(entries, 'zzyyxx'), []));
test('Button outranks aliases for a partial button query', () => assert.equal(autocomplete.matches(entries, 'but')[0].type, 'Button'));
for (const text of ['', 'a ', 'an ', 'a checkbox and ', 'a card with ', 'show ', '/']) {
  test(`browse all at ${JSON.stringify(text)}`, () => assert.equal(ctx(text).query, ''));
}
for (const [text, expected] of [['a bu','bu'], ['a text i','text i'], ['a date p','date p'], ['a card with a check','check'], ["the user's bu",'bu'], ['/drop','drop'], ['a /date p','date p']]) {
  test(`caret query ${text}`, () => assert.equal(ctx(text).query, expected));
}
for (const text of ['a button labeled "bu', "a button labeled 'bu", 'a button labeled “bu', 'a button labeled `bu', 'an image with url "https://example.com/bu', 'https://example.com/bu', 'a button labeled "Save"', 'hello world']) {
  test(`no completion within protected/freeform text ${text}`, () => assert.equal(ctx(text), null));
}
test('quotes and escaped quotes are scanned correctly', () => {
  assert.equal(autocomplete.insideQuote('a button labeled "A \\" bu', 25), true);
  assert.equal(autocomplete.insideQuote("user's button", 13), false);
});
for (const [text, caret, type, expected] of [
  ['a bu',4,'Button','a button '],
  ['a bu labeled "Save"',4,'Button','a button labeled "Save"'],
  ['a button labeled "Save"',4,'Button','a button labeled "Save"'],
  ['a text i',8,'Input','a text input '],
  ['a text input labeled "Email"',4,'Input','a text input labeled "Email"'],
  ['a /drop',7,'Select','a dropdown '],
  ['a card with a ch, and a button',16,'Checkbox','a card with a checkbox, and a button'],
  ['a bu\nand a checkbox',4,'Button','a button\nand a checkbox']
]) {
  test(`replace only the requested name: ${text}`, () => {
    const context = ctx(text, caret);
    assert.ok(context);
    assert.equal(autocomplete.replacement(text,context,entry(type)).value,expected);
  });
}
test('automatic completion never replaces a text selection', () => assert.equal(autocomplete.context('a button',2,8,entries),null));
test('explicit browse can replace a selected phrase', () => {
  const context=autocomplete.context('a button labeled "Save"',2,8,entries,true);
  assert.equal(autocomplete.replacement('a button labeled "Save"',context,entry('Checkbox')).value,'a checkbox labeled "Save"');
});
test('explicit browse does not delete an unrecognized sentence', () => {
  const text='an unknown widget';
  assert.equal(autocomplete.replacement(text,ctx(text,text.length,true),entry('Button')).value,'an unknown widget button ');
});
test('forced browse never edits inside a quoted label', () => assert.equal(ctx('a button labeled "bu',20,true),null));
test('empty or missing registry fails gracefully', () => assert.deepEqual(autocomplete.catalog(null),[]));
test('future registry components appear without editing autocomplete', () => {
  const future=autocomplete.catalog({...registry,Custom:{type:'Custom',aliases:['custom']}});
  assert.equal(future.at(-1).insert,'custom');
});
