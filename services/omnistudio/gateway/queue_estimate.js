'use strict';

// Estimate service time, excluding time already spent waiting in the queue.
function estimateQueue({ jobs, pendingIds, jobId, capacity, now = Date.now() }) {
  const job = jobs.get(jobId);
  const position = pendingIds.indexOf(jobId);
  const queued = job?.status === 'queued';
  const samples = [...jobs.values()]
    .filter(j => j.status === 'completed' && Number.isFinite(j.startedAt) && Number.isFinite(j.completedAt))
    .map(j => (j.completedAt - j.startedAt) / 1000)
    .filter(n => n > 0 && n <= 14400).slice(-100).sort((a,b) => a-b);
  const result = {
    queue_position: queued ? (position < 0 ? null : position + 1) : 0,
    estimated_wait_seconds: null,
    estimated_completion_seconds: null,
    estimate_sample_count: samples.length,
  };
  if (!job || samples.length < 5 || !Number.isInteger(capacity) || capacity < 1 || (queued && position < 0)) return result;
  const service = samples[Math.min(samples.length-1, Math.floor(samples.length * 0.8))];
  const active = [...jobs.values()].filter(j => j.status === 'processing');
  if (active.length > capacity || active.some(j => !Number.isFinite(j.startedAt))) return result;
  // Once a running job exceeds measured service time, its remaining time is unknown.
  if (active.some(j => (now-j.startedAt)/1000 >= service)) return result;
  if (queued) {
    const lanes = active.map(j => Math.max(0, service - (now-j.startedAt)/1000));
    while (lanes.length < capacity) lanes.push(0);
    for (let i=0; i<=position; i++) {
      lanes.sort((a,b) => a-b);
      if (i === position) {
        result.estimated_wait_seconds = Math.ceil(lanes[0]);
        result.estimated_completion_seconds = Math.ceil(lanes[0]+service);
      }
      lanes[0] += service;
    }
  } else if (job.status === 'processing' && Number.isFinite(job.startedAt)) {
    result.estimated_wait_seconds = 0;
    result.estimated_completion_seconds = Math.ceil(Math.max(0, service-(now-job.startedAt)/1000));
  }
  return result;
}

module.exports = { estimateQueue };
