const {test}=require('node:test');
const assert=require('node:assert/strict');
const p=require('../public/component-preview.js');
const spec=(given,when,then)=>p.analyze({steps:[{type:'GIVEN',text:given},{type:'WHEN',text:when},{type:'THEN',text:then}]});
test('hover outcome binds to GIVEN button and escapes tooltip content',()=>{
 const s=spec('A button labeled "Try"','The user hovers the button','show a tooltip with content "<Hello world>"');
 assert.equal(s.interactions[0].target,'component_1');
 assert.match(p.render(s),/aria-describedby="[^"]+-outcome"/);
 assert.match(p.render(s),/role="tooltip"[^>]*>&lt;Hello world&gt;/);
});
test('tooltip supports click and rejects ambiguous buttons',()=>{
 assert.equal(spec('A button','click the button','show a tooltip with content "Hello"').interactions[0].trigger,'click');
 assert.equal(spec('A button and a button','hover the button','show a tooltip with content "Hello"').interactions.length,0);
});
test('quoted button label selects the intended component',()=>{
 const s=spec('A button labeled "One" and a button labeled "Two"','hover the button labeled "Two"','show a tooltip with content "Hello"');
 assert.equal(s.interactions[0].target,'component_2');
 assert.equal(s.components[0].hoverTooltip,undefined);
});
