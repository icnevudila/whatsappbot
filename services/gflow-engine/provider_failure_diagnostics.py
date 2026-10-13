"""Read bounded provider error messages without changing generation status or retrying."""
import json
import re
import sys


def classify_provider_failure(messages, generation_failed=False):
    text = ' '.join(map(str, messages)).lower()
    if any(token in text for token in ('content policy', 'safety policy', 'violates policy', 'policy_violation')):
        category = 'CONTENT_REJECTION'
    elif any(token in text for token in ('submission_uncertain', 'invocation_uncertain', 'timed out', 'timeout')):
        category = 'UNKNOWN_TIMEOUT'
    elif any(token in text for token in ('insufficient credits', 'credit limit', 'resource_exhausted', 'quota exceeded')):
        category = 'QUOTA_ACCOUNT_PROBLEM'
    elif any(token in text for token in ('auth-expired', 'authexpirederror', 'accountchooser', 'unauthenticated', 'http 401', 'default execution context')):
        category = 'SESSION_INFRASTRUCTURE_ERROR'
    elif any(token in text for token in ('service unavailable', 'temporarily unavailable', 'http 503', 'http 502')):
        category = 'TEMPORARY_PROVIDER_ERROR'
    else:
        category = 'GENERATION_FAILURE' if generation_failed else 'UNKNOWN_TIMEOUT'
    return {'category': category,
            'recovery_allowed': bool(generation_failed and category == 'TEMPORARY_PROVIDER_ERROR'),
            'account_switch_allowed': False}


def sanitize_provider_message(message):
    message = re.sub(r'https?://\S+', '[REDACTED_URL]', str(message))
    message = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', '[REDACTED_EMAIL]', message)
    message = re.sub(r'(?i)(bearer\s+|(?:token|cookie|password|secret)\s*[:=]\s*)\S+', r'\1[REDACTED]', message)
    return message.strip()[:500]


async def observe_terminal_failure(page, record):
    if record is None or record.is_done or record.is_running:
        return record
    details = []
    # Preserve an explicit provider reason when the pinned record exposes one;
    # never infer a cause from status 4 or serialize arbitrary record credentials.
    for key in ('error_message', 'error_code', 'failure_reason'):
        value = getattr(record, key, None)
        if isinstance(value, (str, int)) and str(value).strip():
            detail = sanitize_provider_message(value)
            if detail not in details:
                details.append(detail)
    try:
        alerts = page.locator('[role="alert"], [aria-live="assertive"]')
        for index in range(min(await alerts.count(), 5)):
            item = alerts.nth(index)
            if await item.is_visible():
                text = sanitize_provider_message(await item.inner_text(timeout=1500))
                if text and text not in details:
                    details.append(text)
        errors = page.get_by_text(re.compile(r"couldn.t generate|generation failed|unable to generate|insufficient credits|violates.*policy|something went wrong", re.I))
        for index in range(min(await errors.count(), 5)):
            item = errors.nth(index)
            if await item.is_visible():
                text = sanitize_provider_message(await item.inner_text(timeout=1500))
                if text and text not in details:
                    details.append(text)
    except Exception as error:
        details.append('DIAGNOSTIC_UNAVAILABLE: ' + type(error).__name__)
    sys.stderr.write(json.dumps({'event': 'mesajify.provider_failure', 'status': record.status,
                                'workflow_id': record.workflow_id, 'details': details,
                                'classification': classify_provider_failure(details, generation_failed=True)}) + '\n')
    sys.stderr.flush()
    return record
