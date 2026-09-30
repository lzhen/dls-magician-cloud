const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../public/component-autocomplete.js');
const components = api.catalog({Tooltip:{type:'Tooltip',aliases:['tooltip']},Dialog:{type:'Dialog',aliases:['dialog']},Switch:{type:'Switch',aliases:['switch']},Input:{type:'Input',aliases:['text input','input']},Button:{type:'Button',aliases:['button']}});
const outcomes = api.catalogForIntent('THEN', components);
test('intent catalogs stay isolated', () => {
 assert.equal(api.suggestionKind('THEN'),'outcome');
 assert.equal(api.catalogForIntent('GIVEN',components), components);
 assert.equal(api.catalogForIntent('WHEN',components)[0].kind,'behavior');
 assert.ok(outcomes.every(item => item.kind==='outcome'));
});
test('outcomes have editable action, target, parameters', () => {
 assert.ok(outcomes.some(item=>item.insert==='show a tooltip with content "Hello world"'));
 assert.ok(outcomes.some(item=>item.insert==='navigate to "/next"'));
 assert.ok(outcomes.some(item=>item.insert==='set this switch to on'));
});
test('template prefix replaces exactly once', () => {
 const value='show a tool'; const ctx=api.context(value,value.length,value.length,outcomes);
 assert.equal(api.replacement(value,ctx,api.matches(outcomes,ctx.query)[0]).value,'show a tooltip with content "Hello world" ');
});
test('unrecognized prose preserved when browsing at caret', () => {
 const value='keep my existing sentence';const ctx=api.context(value,value.length,value.length,outcomes,true);
 const result=api.replacement(value,ctx,outcomes[0]);assert.ok(result.value.startsWith(value+' '));
});
test('quoted text and URLs never trigger completion', () => {
 for(const value of ['show a tooltip with content "show','navigate to https://example.com/show']) assert.equal(api.context(value,value.length,value.length,outcomes,true),null);
});
test('action plus component partial matches renderer registry target', () => {
 const value='show a butt';const ctx=api.context(value,value.length,value.length,outcomes);
 assert.equal(api.matches(outcomes,ctx.query)[0].insert,'show a button');
 assert.ok(!api.outcomeCatalog(components).some(item=>item.target==='Table'));
});
test('preceding clauses retained when completing a new result', () => {
 const value='hide this component; open a dia';const ctx=api.context(value,value.length,value.length,outcomes);
 const result=api.replacement(value,ctx,api.matches(outcomes,ctx.query)[0]);
 assert.equal(result.value,'hide this component; open a dialog with content "Settings" ');
});
