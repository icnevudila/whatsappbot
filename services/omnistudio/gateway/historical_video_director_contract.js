'use strict';
const crypto = require('node:crypto');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function validateHistoricalDirectorInput(body) {
  if (!body || !UUID.test(body.org_id || '') || !UUID.test(body.job_id || '') || !UUID.test(body.attempt_id || '')) throw new Error('HISTORICAL_DIRECTOR_IDENTITY_REQUIRED');
  if (typeof body.prompt !== 'string' || body.prompt.length < 100 || body.prompt.length > 40000) throw new Error('HISTORICAL_DIRECTOR_PROMPT_REQUIRED');
  const refs = body.references;
  if (!Array.isArray(refs) || refs.length !== 2 || body.expected_reference_count !== 2 || refs.filter(r=>r.role==='logo').length!==1 || refs.filter(r=>r.role==='product').length!==1) throw new Error('HISTORICAL_DIRECTOR_REFERENCE_PAIR_REQUIRED');
  const hashes = new Set(); const identities = new Set();
  for (const ref of refs) {
    if (ref.org_id !== body.org_id || !UUID.test(ref.asset_id || '') || !/^[a-f0-9]{64}$/i.test(ref.sha256 || '')) throw new Error('HISTORICAL_DIRECTOR_REFERENCE_PROVENANCE_INVALID');
    const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(ref.data || '');
    if (!match || match[1] !== ref.mimeType) throw new Error('HISTORICAL_DIRECTOR_IMAGE_BYTES_REQUIRED');
    const bytes = Buffer.from(match[2], 'base64');
    if (bytes.length < 8 || bytes.length > 5*1024*1024 || crypto.createHash('sha256').update(bytes).digest('hex') !== ref.sha256.toLowerCase()) throw new Error('HISTORICAL_DIRECTOR_SHA_MISMATCH');
    const validSignature = ref.mimeType==='image/png' ? bytes.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) : ref.mimeType==='image/jpeg' ? bytes[0]===255 && bytes[1]===216 : bytes.subarray(0,4).toString()==='RIFF' && bytes.subarray(8,12).toString()==='WEBP';
    if (!validSignature || hashes.has(ref.sha256.toLowerCase()) || identities.has(ref.asset_id)) throw new Error('HISTORICAL_DIRECTOR_INVALID_REFERENCE_PAIR');
    hashes.add(ref.sha256.toLowerCase()); identities.add(ref.asset_id);
  }
  return refs;
}
function assertHistoricalDirectorReceipt(receipt, refs, orgId) {
  if (!receipt || receipt.org_id!==orgId || receipt.composer_attachment_count!==2 || receipt.uploaded_reference_count!==2 || !Array.isArray(receipt.references) || receipt.references.length!==2) throw new Error('HISTORICAL_DIRECTOR_PHYSICAL_ATTACHMENTS_UNVERIFIED');
  for (const ref of refs) if (receipt.references.filter(r=>r.asset_id===ref.asset_id && r.role===ref.role && r.sha256===ref.sha256).length!==1) throw new Error('HISTORICAL_DIRECTOR_PHYSICAL_REFERENCE_MISMATCH');
}
module.exports = { validateHistoricalDirectorInput, assertHistoricalDirectorReceipt };
