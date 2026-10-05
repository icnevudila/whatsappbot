"""Read bounded provider error messages without changing generation status or retrying."""
import json
import re
import sys


def sanitize_provider_message(message):
    message = re.sub(r'https?://\S+', '[REDACTED_URL]', str(message))
    message = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', '[REDACTED_EMAIL]', message)
    message = re.sub(r'(?i)(bearer\s+|(?:token|cookie|password|secret)\s*[:=]\s*)\S+', r'\1[REDACTED]', message)
    return message.strip()[:500]


async def observe_terminal_failure(page, record):
    if record is None or record.is_done or record.is_running:
        return record
    details = []
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
                                'workflow_id': record.workflow_id, 'details': details}) + '\n')
    sys.stderr.flush()
    return record
