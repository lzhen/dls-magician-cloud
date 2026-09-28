'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const api = require('../public/component-preview.js');
const generated = text => ({steps:[{type:'GIVEN',text}]});

test('quoted option labels that are property keywords remain data',()=>{
 const spec=api.analyze(generated('a table with columns "Name", "Title", "Value"'));
 assert.deepEqual(spec.components[0].props.options,['Name','Title','Value']);
});
test('helper text is not mistaken for an input label',()=>{
 const spec=api.analyze(generated('an input with helper text "Use a work email"'));
 assert.equal(spec.components[0].props.label,'');
 assert.equal(spec.components[0].props.content,'Use a work email');
});
