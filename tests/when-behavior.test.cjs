'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../public/component-autocomplete.js');
const {registry} = require('../public/component-preview.js');
const components = api.catalog(registry);
const behaviors = api.behaviorCatalog();
const behavior = type => behaviors.find(item => item.type === type);
const ctx = (text, caret = text.length, force = false) => api.context(text, caret, caret, behaviors, force);

test('WHEN contains 24 distinct documented behaviors, not components', () => {
  assert.equal(behaviors.length, 24);
  assert.equal(new Set(behaviors.map(item => item.type)).size, 24);
  assert.ok(behaviors.every(item => item.kind === 'behavior' && item.description));
  assert.equal(api.matches(behaviors, 'button').length, 0);
  assert.equal(api.matches(behaviors, 'card').length, 0);
});
for (const item of behaviors) {
  test(`${item.type}: all aliases find the behavior and canonical insertion`, () => {
    assert.ok(item.aliases.includes(item.insert));
    for (const alias of item.aliases) assert.ok(api.matches(behaviors, alias).some(result => result.type === item.type), alias);
    assert.ok(api.matches(behaviors, item.insert).some(result => result.type === item.type));
  });
}
for (const type of ['GIVEN', 'AND', undefined]) {
  test(`${type}: component registry remains unchanged`, () => {
    assert.strictEqual(api.catalogForIntent(type, components, behaviors), components);
    assert.equal(api.suggestionKind(type), 'component');
  });
}
for (const type of ['WHEN', 'when']) {
  test(`${type}: selects the behavior catalog`, () => {
    assert.strictEqual(api.catalogForIntent(type, components, behaviors), behaviors);
    assert.equal(api.suggestionKind(type), 'behavior');
  });
}
for (const [query, expected] of [['cli','Click'],['click','Click'],['hov','Hover'],['tap','Click'],['foc','Focus'],['blu','Blur'],['typ','Input'],['input','Input'],['change','Change'],['sel','Select'],['check','Check'],['unc','Uncheck'],['tog','Toggle'],['keyd','KeyDown'],['enter','PressEnter'],['esc','PressEscape'],['sub','Submit'],['drag','DragStart'],['drop','Drop'],['scroll','Scroll'],['load','Load']]) {
  test(`behavior query ${query}`, () => assert.equal(api.matches(behaviors, query)[0].type, expected));
}
for (const text of ['', '/', 'the user ', 'user ', 'on ', 'when ']) {
  test(`empty behavior browse: ${JSON.stringify(text)}`, () => assert.equal(ctx(text).query, ''));
}
for (const [text, caret, type, expected] of [
  ['cli', 3, 'Click', 'click '],
  ['hover', 5, 'Hover', 'hover '],
  ['cli the button', 3, 'Click', 'click the button'],
  ['hov over the button labeled "Save"', 3, 'Hover', 'hover over the button labeled "Save"'],
  ['the user cli', 12, 'Click', 'the user click '],
  ['/double c', 9, 'DoubleClick', 'double click '],
  ['double click the button', 6, 'DoubleClick', 'double click the button'],
  ['press Enter on the field', 3, 'PressEnter', 'press Enter on the field'],
  ['cli\nand focus the field', 3, 'Click', 'click\nand focus the field'],
  ['tap', 3, 'Click', 'click ']
]) test(`caret-safe behavior replacement: ${text}`, () => {
  assert.equal(api.replacement(text, ctx(text, caret), behavior(type)).value, expected);
});
for (const text of ['click "hov', "click 'foc", 'type “cli', 'type `cli', 'https://example.com/cli', 'click the button']) {
  test(`preserve target/quoted text: ${text}`, () => assert.equal(ctx(text), null));
}
test('explicit selection replacement preserves the target', () => {
  const text = 'click the button';
  const range = api.context(text, 0, 5, behaviors, true);
  assert.equal(api.replacement(text, range, behavior('Hover')).value, 'hover the button');
});
test('unrecognized free text is not deleted by browsing', () => {
  const text = 'the server becomes ready';
  assert.equal(ctx(text), null);
  assert.equal(api.replacement(text, ctx(text, text.length, true), behavior('Load')).value, text + ' load ');
});
test('component prefixes do not appear in WHEN', () => {
  for (const q of ['button', 'card', 'datepicker', 'avatar', 'tooltip']) assert.equal(api.matches(behaviors, q).length, 0);
});
test('the same alias can have different meaning by field', () => {
  assert.equal(api.matches(api.catalogForIntent('GIVEN', components, behaviors), 'switch')[0].type, 'Switch');
  assert.equal(api.matches(api.catalogForIntent('WHEN', components, behaviors), 'switch')[0].type, 'Toggle');
});
