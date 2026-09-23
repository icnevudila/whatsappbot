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

function asNonNegativeMs(value) {
  return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
}

function createJobMetrics({ operation, tenantId = null, requestId = null, prompt = '', companyContext = '', conversationHistory = '', productCount = 0, now = Date.now() }) {
  return {
    operation,
    tenant_id: tenantId || null,
    request_id: requestId || null,
    started_at_ms: now,
    system_prompt_chars: 0,
    context_chars: String(companyContext || '').length,
    conversation_chars: String(conversationHistory || '').length,
    product_count_injected: Number.isFinite(productCount) ? productCount : 0,
    input_prompt_chars: String(prompt || '').length,
    stages: Object.fromEntries(STAGES.map((stage) => [stage, null])),
  };
}

function setStage(metrics, stage, elapsedMs) {
  if (!metrics || !Object.prototype.hasOwnProperty.call(metrics.stages, stage)) return;
  metrics.stages[stage] = asNonNegativeMs(elapsedMs);
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
    total_ms: asNonNegativeMs(now - metrics.started_at_ms),
  };
  console.log(JSON.stringify(payload));
  return payload;
}

module.exports = { STAGES, createJobMetrics, setStage, finishMetrics };
