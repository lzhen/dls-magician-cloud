'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {recordMetric}=require('../metrics.cjs');
test('usage counts reject arbitrary fields and prune old days without storing identifiers',()=>{
  const db={},time=Date.parse('2026-10-11T00:00:00Z');
  recordMetric(db,'login',time-91*86400_000);
  recordMetric(db,'generation_success',time);
  recordMetric(db,'generation_success',time);
  assert.deepEqual(db,{metrics:{daily:{'2026-10-11':{generation_success:2}}}});
  assert.throws(()=>recordMetric(db,'private workflow text',time),/Unknown metric/);
  assert.doesNotMatch(JSON.stringify(db),/email|token|userId|projectId|address/);
});
