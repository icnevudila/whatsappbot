'use strict';

// Public liveness must never serialize queue records or worker session details.
function publicHealthStats(stats) {
  const safe = {};
  for (const key of ['pending', 'activeCount', 'queued_jobs', 'active_jobs', 'total',
    'retainedCompletedJobs', 'retainedFailedJobs', 'retained_result_bytes', 'cleanupCount']) {
    if (Number.isFinite(stats[key]) && stats[key] >= 0) safe[key] = stats[key];
  }
  safe.workersStatus = Object.fromEntries(Object.entries(stats.workersStatus || {}).map(([id, worker]) =>
    [id, { status: ['idle', 'busy', 'waiting_login', 'offline', 'error'].includes(worker.status) ? worker.status : 'unknown' }]));
  return safe;
}

module.exports = { publicHealthStats };
