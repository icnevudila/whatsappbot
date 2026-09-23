'use strict';

// Request/job telemetry deliberately stores only sizes and identifiers: never prompt,
// response, cookies, tokens or base64 media.  It is safe to enable in production logs.
const STAGES = Object.freeze([
  'request_received_ms',
  'tenant_resolve_ms',
  'brand_context_ms',
  'product_context_ms',
  'prompt_build_ms',
  'queue_wait_ms',
  'ai_request_ms',
  'response_parse_ms',
  'media_generation_ms',
  'result_delivery_ms',
]);

const WORKER_STAGES = Object.freeze([
  'worker_acquire_ms',
  'tab_acquire_ms',
  'tab_ready_ms',
  'prompt_insert_ms',
  'reference_upload_ms',
  'submit_ms',
  'first_response_signal_ms',
  'response_complete_ms',
  'generation_start_detect_ms',
  'generation_complete_detect_ms',
  'image_acquire_ms',
  'decode_process_ms',
  'parse_ms',
  'provider_wait_ms',
  'infrastructure_overhead_ms',
  'total_worker_ms',
]);

function asNonNegativeMs(value) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function createJobMetrics({
  operation,
  tenantId = null,
  requestId = null,
  prompt = '',
  companyContext = '',
  conversationHistory = '',
  productCount = 0,
  systemPromptChars = 0,
  now = Date.now(),
}) {
  return {
    operation,
    tenant_id: tenantId || null,
    request_id: requestId || null,
    started_at_ms: now,
    system_prompt_chars: Number.isFinite(systemPromptChars) ? systemPromptChars : 0,
    context_chars: String(companyContext || '').length,
    conversation_chars: String(conversationHistory || '').length,
    product_count_injected: Number.isFinite(productCount) ? productCount : 0,
    input_prompt_chars: String(prompt || '').length,
    stages: Object.fromEntries(STAGES.map((stage) => [stage, null])),
    worker_stages: {},
  };
}

function setStage(metrics, stage, elapsedMs) {
  if (!metrics || !Object.prototype.hasOwnProperty.call(metrics.stages, stage)) return;
  metrics.stages[stage] = asNonNegativeMs(elapsedMs);
}

function setWorkerStage(metrics, stage, elapsedMs) {
  if (!metrics || !WORKER_STAGES.includes(stage)) return;
  const val = asNonNegativeMs(elapsedMs);
  if (val !== null) {
    metrics.worker_stages[stage] = val;
  }
}

function recordWorkerStages(metrics, timings) {
  if (!metrics || !timings || typeof timings !== 'object') return;
  for (const [key, value] of Object.entries(timings)) {
    if (WORKER_STAGES.includes(key)) {
      const val = asNonNegativeMs(value);
      if (val !== null) metrics.worker_stages[key] = val;
    }
  }
}

function finishMetrics(metrics, { result = 'success', errorCode = null, now = Date.now() } = {}) {
  if (!metrics) return null;
  const payload = {
    event: 'omnistudio_runtime_metric',
    operation: metrics.operation,
    tenant_id: metrics.tenant_id,
    request_id: metrics.request_id,
    result,
    error_code: errorCode,
    prompt_sizes: {
      system_prompt_chars: metrics.system_prompt_chars,
      context_chars: metrics.context_chars,
      conversation_chars: metrics.conversation_chars,
      product_count_injected: metrics.product_count_injected,
      input_prompt_chars: metrics.input_prompt_chars,
    },
    stages: metrics.stages,
    worker_stages: metrics.worker_stages || {},
    total_ms: asNonNegativeMs(now - metrics.started_at_ms),
  };
  console.log(JSON.stringify(payload));
  return payload;
}

module.exports = {
  STAGES,
  WORKER_STAGES,
  createJobMetrics,
  setStage,
  setWorkerStage,
  recordWorkerStages,
  finishMetrics,
};
