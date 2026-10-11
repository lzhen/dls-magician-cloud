'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createRequestGuard } = require('../request-security.cjs');
const request = (headers = {}, address = '127.0.0.1') => ({ method: 'PATCH', headers, socket: { remoteAddress: address } });
test('rejects foreign browser origins and cross-site mutations', () => {
  const guard = createRequestGuard({ origins: ['https://dlsmagician.empathie.ai'] });
  assert.equal(guard(request({ origin: 'https://attacker.invalid' })).status, 403);
  assert.equal(guard(request({ 'sec-fetch-site': 'cross-site' })).status, 403);
  assert.equal(guard(request({ origin: 'https://dlsmagician.empathie.ai' })), null);
  assert.equal(guard(request()), null); // Bearer authenticated native clients.
});
test('untrusted forwarded headers cannot bypass limits; buckets expire', () => {
  let time = 0;
  const guard = createRequestGuard({ limit: 2, windowMs: 1000, now: () => time });
  assert.equal(guard(request({ 'x-forwarded-for': 'fake-a' })), null);
  assert.equal(guard(request({ 'x-forwarded-for': 'fake-b' })), null);
  assert.equal(guard(request({ 'x-forwarded-for': 'fake-c' })).status, 429);
  time = 1000;
  assert.equal(guard(request()), null);
});
test('trusted proxy isolates client budgets and refuses excess bucket allocation', () => {
  const guard = createRequestGuard({ trustedProxy: true, limit: 1, maxBuckets: 2 });
  assert.equal(guard(request({ 'x-forwarded-for': 'client-a, proxy' })), null);
  assert.equal(guard(request({ 'x-forwarded-for': 'client-b, proxy' })), null);
  assert.equal(guard(request({ 'x-forwarded-for': 'client-a' })).status, 429);
  assert.equal(guard(request({ 'x-forwarded-for': 'client-c' })).status, 429);
});
