'use strict';
const crypto = require('node:crypto');
const { DurableJobStore } = require('./durable_job_store');
const { typedError } = require('./gateway_request_guard');

const VIDEO_STATES = new Set(['queued', 'processing', 'completed', 'failed', 'reconciliation_required']);
function canonicalJSON(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).filter(k => value[k] !== undefined).sort()
      .map(k => JSON.stringify(k) + ':' + canonicalJSON(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}
function videoRequestHash(body, orgId) {
  const input = {
    orgId, prompt: body.prompt || '', generationRevision: body.generationRevision ?? body.generation_revision ?? 0,
    creativeId: body.creativeId || body.creative_id || null,
    logoUrl: body.logoUrl || null, logoSha256: body.logoSha256 || body.logo_sha256 || null,
    productImageUrl: body.productImageUrl || null, productSha256: body.productSha256 || body.product_asset_sha256 || null,
    references: body.referenceImageUrls || [], assets: body.assets || [],
    referenceSha256: body.referenceSha256 || body.reference_sha256 || [],
    creativeEngineMode: body.creativeEngineMode || null, approvedDialogue: body.approvedDialogue ?? null,
    model: body.model || null, aspectRatio: body.aspectRatio || '9:16', duration: body.duration || 8,
    engine: body.preferredEngine || body.engine || 'flow', mode: body.mode || null,
    subtitles: body.subtitles !== false, disableProviderFallback: body.disableProviderFallback === true,
    useOfficialApi: body.useOfficialApi === true,
  };
  return crypto.createHash('sha256').update(canonicalJSON(input)).digest('hex');
}

// A separate namespace uses the existing fsync/checksummed private store. Video
// IDs/statuses remain unchanged at the public API boundary; image records do not change.
class VideoJobPersistence {
  constructor(directory) { this.store = new DurableJobStore(directory); }
  recordId(id) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,160}$/.test(id)) throw typedError('INVALID_VIDEO_JOB_ID', 400);
    return 'job_' + crypto.createHash('sha256').update(id).digest('hex').slice(0, 16);
  }
  validate(record) {
    const job = record.videoRecord;
    if (!job || this.recordId(job.id) !== record.id || !VIDEO_STATES.has(job.status)) {
      throw typedError('VIDEO_DURABLE_STATE_INVALID', 503);
    }
    return job;
  }
  save(job) {
    const id = this.recordId(job.id);
    const existing = this.store.read(id);
    if (existing && this.validate(existing).id !== job.id) throw typedError('VIDEO_JOB_ID_COLLISION', 503);
    this.store.save({ id, status: 'pending', createdAt: job.enqueuedAt, videoRecord: job });
  }
  read(id) { const record = this.store.read(this.recordId(id)); return record ? this.validate(record) : null; }
  load() { return this.store.load().map(record => this.validate(record)); }
}
module.exports = { VideoJobPersistence, videoRequestHash, canonicalJSON };
