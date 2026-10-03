'use strict';
function validateReferenceReceipt(job, input) {
  const fail = code => { throw Object.assign(new Error(code), {code,statusCode:409}); };
  if (!job || job.id !== input?.job_id || !job.assignedTo || job.assignedTo !== input.worker_id ||
      job.status !== 'processing' || !input.target_id || input.conversation_owner_job_id !== job.id) fail('IMAGE_REFERENCE_OWNER_MISMATCH');
  const expected = job.expectedReferenceCount ?? job.referenceImagesCount;
  if (!Number.isSafeInteger(expected) || expected < 1 || expected > 4) fail('REFERENCE_ATTACHMENT_FAILED');
  for (const key of ['expected_reference_count','resolved_reference_count','uploaded_reference_count','composer_attachment_count'])
    if(input[key] !== expected) fail('REFERENCE_ATTACHMENT_FAILED');
  if (!Number.isFinite(Date.parse(input.attachments_ready_at))) fail('IMAGE_REFERENCE_RECEIPT_INVALID');
  if (job.referenceReceipt && (job.referenceReceipt.target_id !== input.target_id || job.referenceReceipt.worker_id !== input.worker_id)) fail('IMAGE_REFERENCE_OWNER_MISMATCH');
  return Object.fromEntries(['job_id','worker_id','target_id','conversation_owner_job_id','expected_reference_count','resolved_reference_count','uploaded_reference_count','composer_attachment_count','attachments_ready_at'].map(key=>[key,input[key]]));
}
module.exports = {validateReferenceReceipt};
