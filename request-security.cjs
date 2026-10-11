'use strict';
const crypto = require('node:crypto');

// Railway overwrites X-Forwarded-For at the trusted public edge. Locally use
// the socket address; the proxy header is ignored unless explicitly enabled.
function createRequestGuard({ trustedProxy = false, origins = [], now = Date.now, limit = 120, windowMs = 60_000, maxBuckets = 10_000 } = {}) {
  const buckets = new Map();
  return function guard(req) {
    const origin = req.headers.origin;
    if (origin && !origins.includes(origin)) return { status: 403, error: 'Request origin is not allowed.' };
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers['sec-fetch-site'] === 'cross-site') {
      return { status: 403, error: 'Cross-site mutations are not allowed.' };
    }
    const time = now();
    for (const [key, entry] of buckets) if (entry.expires <= time) buckets.delete(key);
    const address = trustedProxy ? String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim() : req.socket?.remoteAddress || 'unknown';
    const key = crypto.createHash('sha256').update(address).digest('hex');
    let bucket = buckets.get(key);
    if (!bucket) {
      if (buckets.size >= maxBuckets) return { status: 429, error: 'Please retry shortly.', retryAfter: Math.ceil(windowMs / 1000) };
      bucket = { count: 0, expires: time + windowMs };
      buckets.set(key, bucket);
    }
    if (++bucket.count > limit) return { status: 429, error: 'Please retry shortly.', retryAfter: Math.max(1, Math.ceil((bucket.expires - time) / 1000)) };
    return null;
  };
}
module.exports = { createRequestGuard };
