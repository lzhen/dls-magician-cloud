const {test}=require('node:test');const assert=require('node:assert/strict');
const p=require('../public/component-preview.js');const scenarios=require('../public/behavior-scenarios.js');
for(const scenario of scenarios)test(scenario.name+' compiles to executable or explicitly simulated rules',()=>{
 const spec=p.analyze({steps:scenario.steps});assert.deepEqual(spec.warnings,[]);assert.ok(spec.interactions.length);
 const ids=new Set(p.flat(spec.components).map(n=>n.id));for(const rule of spec.interactions){assert.ok(ids.has(rule.source));assert.ok(ids.has(rule.target));}
 assert.match(p.render(spec),/data-interactions=/);
});
const analyze=(given,when,then)=>p.analyze({steps:[{type:'GIVEN',text:given},{type:'WHEN',text:when},{type:'THEN',text:then}]});
test('navigation rejects executable and protocol relative destinations',()=>{
 for(const url of ['javascript:alert(1)','//other.site']){const s=analyze('A button','click the button',`navigate to "${url}"`);assert.equal(s.interactions.length,0);assert.ok(s.warnings.length);}
});
test('multiple outcomes retain quoted semicolons and targets',()=>{
 const s=analyze('A button and an input','click the button','update the input value to "A;B"; show a toast with content "Done"');assert.equal(s.interactions.length,2);assert.equal(s.interactions[0].value,'A;B');assert.equal(s.interactions[0].target,'component_2');
});
test('unsupported outcome surfaces a warning',()=>{const s=analyze('A button','click the button','charge the credit card');assert.equal(s.interactions.length,0);assert.match(s.warnings[0],/Not executable/);});
test('dialog begins hidden and form submit uses native semantics',()=>{
 const s=analyze('A button','click the button','open a dialog with content "Settings"');assert.equal(s.components[1].initialHidden,true);assert.match(p.render(s),/data-component="Dialog"[^>]* hidden/);
 const form=analyze('A form containing a required input and a button labeled "Submit"','submit the form','validate the form');assert.match(p.render(form),/type="submit"/);
});
test('a trigger naming a missing component is not bound to the only other component',()=>{assert.equal(analyze('A button','hover the input','show a tooltip with content "Oops"').interactions.length,0);});
test('component type capabilities reject ineffective actions',()=>{const s=analyze('A button','click the button','clear this component');assert.equal(s.interactions.length,0);assert.match(s.warnings[0],/not supported/);});
test('nested component IDs remain unique when creating an outcome target',()=>{const s=analyze('A form containing an input and a button labeled "Run"','click the button','open a dialog');const ids=p.flat(s.components).map(n=>n.id);assert.equal(new Set(ids).size,ids.length);});
test('expanding an accordion does not hide its container',()=>{const s=analyze('A button and an accordion','click the button','expand the accordion');assert.equal(s.components[1].initialHidden,undefined);});
test('toggle vocabulary selects an explicit checkbox rather than an absent switch',()=>{assert.equal(analyze('A checkbox','The user toggles the checkbox','show a toast with content "Changed"').interactions.length,1);});
