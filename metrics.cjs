'use strict';
const EVENTS = new Set(['signup', 'login', 'first_workflow', 'generation_success', 'generation_error', 'export', 'share', 'return_session', 'error']);
function recordMetric(db, event, now = Date.now()) {
  if (!EVENTS.has(event)) throw new Error('Unknown metric event');
  const day = new Date(now).toISOString().slice(0, 10);
  db.metrics ||= { daily: {} };
  db.metrics.daily[day] ||= {};
  db.metrics.daily[day][event] = (db.metrics.daily[day][event] || 0) + 1;
  for (const key of Object.keys(db.metrics.daily)) {
    if (Date.parse(key) < now - 90 * 86400_000) delete db.metrics.daily[key];
  }
}
module.exports = { recordMetric };
