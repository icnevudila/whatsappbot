'use strict';

const CAPABILITY_STATES = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  AVAILABLE_WITH_WARNING: 'AVAILABLE_WITH_WARNING',
  NO_QUOTA: 'NO_QUOTA',
  FEATURE_UNAVAILABLE: 'FEATURE_UNAVAILABLE',
  TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  ACCOUNT_CONFIGURATION_REQUIRED: 'ACCOUNT_CONFIGURATION_REQUIRED',
  UNKNOWN: 'UNKNOWN',
});

const FALLBACK_CAPABILITY_STATES = new Set([
  CAPABILITY_STATES.NO_QUOTA,
  CAPABILITY_STATES.FEATURE_UNAVAILABLE,
  CAPABILITY_STATES.TEMPORARILY_UNAVAILABLE,
]);

function classifyGeminiVideoError(input) {
  const code = String(input?.code || '').toUpperCase();
  const message = String(input?.message || input || '').toLowerCase();
  const corpus = `${code} ${message}`;

  if (/tenant.*mismatch|cross[_ -]?org|asset_org_mismatch/.test(corpus)) return { code: 'TENANT_MISMATCH', state: CAPABILITY_STATES.UNKNOWN };
  if (/invalid[_ -]?asset|ingredient_attachment_failed|asset.*missing|sha.*mismatch/.test(corpus)) return { code: 'INVALID_ASSET', state: CAPABILITY_STATES.UNKNOWN };
  if (/invalid[_ -]?job|job.*invalid/.test(corpus)) return { code: 'INVALID_JOB', state: CAPABILITY_STATES.UNKNOWN };
  if (/policy|safety|unsafe|blocked content/.test(corpus)) return { code: 'POLICY_REJECTED', state: CAPABILITY_STATES.UNKNOWN };
  if (/user[_ -]?cancel/.test(corpus)) return { code: 'USER_CANCELLED', state: CAPABILITY_STATES.UNKNOWN };
  if (/factual|wrong[_ -]?product/.test(corpus)) return { code: 'FACTUAL_GATE_FAILURE', state: CAPABILITY_STATES.UNKNOWN };
  if (/runtime_blocked|1040|activity_off_rejected|gemini_runtime_blocked/.test(corpus)) {
    return { code: 'GEMINI_RUNTIME_BLOCKED', state: CAPABILITY_STATES.ACCOUNT_CONFIGURATION_REQUIRED };
  }
  if (/gemini apps activity is off|etkinliği kapalı|activity.*off/.test(corpus)) {
    return { code: 'GEMINI_APPS_ACTIVITY_OFF', state: CAPABILITY_STATES.ACCOUNT_CONFIGURATION_REQUIRED };
  }
  if (/quota|credit.*limit|video generation limit|video üretme sınır|rate[_ -]?limit/.test(corpus)) {
    return { code: 'GEMINI_VIDEO_NO_QUOTA', state: CAPABILITY_STATES.NO_QUOTA };
  }
  if (/feature.*unavailable|not available for your account|does not support video|video.*erişiminiz yok|video.*kullanılamıyor/.test(corpus)) {
    return { code: 'GEMINI_VIDEO_FEATURE_UNAVAILABLE', state: CAPABILITY_STATES.FEATURE_UNAVAILABLE };
  }
  if (/sign in|oturum aç|auth|required|session expired/.test(corpus)) {
    return { code: 'GEMINI_VIDEO_AUTH_REQUIRED', state: CAPABILITY_STATES.AUTH_REQUIRED };
  }
  if (/timeout|time out|zaman aşımı|temporar|network|websocket|cdp_port_unavailable|targetclosed|browser.*closed|input.*yüklenemedi|something went wrong/.test(corpus)) {
    return { code: 'GEMINI_VIDEO_TEMPORARILY_UNAVAILABLE', state: CAPABILITY_STATES.TEMPORARILY_UNAVAILABLE };
  }
  return { code: 'GEMINI_VIDEO_UNKNOWN', state: CAPABILITY_STATES.UNKNOWN };
}

function createGeminiVideoError(input) {
  const classified = classifyGeminiVideoError(input);
  const error = new Error(input?.message || String(input || classified.code));
  error.code = classified.code;
  error.capabilityState = classified.state;
  return error;
}

module.exports = {
  CAPABILITY_STATES,
  FALLBACK_CAPABILITY_STATES,
  classifyGeminiVideoError,
  createGeminiVideoError,
};

