import asyncio
import contextlib
import io
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from provider_failure_diagnostics import observe_terminal_failure, sanitize_provider_message, classify_provider_failure


class FailureDiagnosticsTests(unittest.TestCase):
    def test_failure_classes_do_not_allow_policy_or_uncertain_account_retry(self):
        cases = [('Content policy rejection', 'CONTENT_REJECTION'),
                 ('Whisper request timed out', 'UNKNOWN_TIMEOUT'),
                 ('Insufficient credits', 'QUOTA_ACCOUNT_PROBLEM'),
                 ('AuthExpiredError', 'SESSION_INFRASTRUCTURE_ERROR'),
                 ('HTTP 503 service unavailable', 'TEMPORARY_PROVIDER_ERROR'),
                 ('Provider status 4 without details', 'GENERATION_FAILURE')]
        for message, expected in cases:
            result = classify_provider_failure([message], generation_failed=True)
            self.assertEqual(result['category'], expected)
            self.assertEqual(result['recovery_allowed'], expected == 'TEMPORARY_PROVIDER_ERROR')
            self.assertFalse(result['account_switch_allowed'])
        self.assertFalse(classify_provider_failure(['HTTP 503'], generation_failed=False)['recovery_allowed'])

    def test_successful_and_running_records_do_not_touch_the_page(self):
        for status in (2, 3, 6):
            record = SimpleNamespace(status=status, is_done=status == 3, is_running=status in (2, 6))
            self.assertIs(asyncio.run(observe_terminal_failure(None, record)), record)

    def test_explicit_provider_reason_survives_without_serializing_arbitrary_record_fields(self):
        class EmptyLocator:
            async def count(self): return 0
        page = SimpleNamespace(locator=lambda selector: EmptyLocator(), get_by_text=lambda pattern: EmptyLocator())
        record = SimpleNamespace(status=4, is_done=False, is_running=False, workflow_id='owned',
                                 error_message='Content policy rejection', access_token='must-not-leak')
        output = io.StringIO()
        with contextlib.redirect_stderr(output):
            asyncio.run(observe_terminal_failure(page, record))
        event = json.loads(output.getvalue())
        self.assertEqual(event['details'], ['Content policy rejection'])
        self.assertEqual(event['classification']['category'], 'CONTENT_REJECTION')
        self.assertFalse(event['classification']['account_switch_allowed'])
        self.assertNotIn('must-not-leak', output.getvalue())

    def test_failed_record_preserves_status_and_only_reads_visible_error_messages(self):
        class Item:
            async def is_visible(self): return True
            async def inner_text(self, **kwargs): return 'Insufficient credits for person@example.com'
        class Locator:
            async def count(self): return 1
            def nth(self, index): return Item()
        page = SimpleNamespace(locator=lambda selector: Locator(), get_by_text=lambda pattern: Locator())
        record = SimpleNamespace(status=4, is_done=False, is_running=False, workflow_id='owned-workflow')
        output = io.StringIO()
        with contextlib.redirect_stderr(output):
            actual = asyncio.run(observe_terminal_failure(page, record))
        self.assertIs(actual, record)
        event = json.loads(output.getvalue())
        self.assertEqual(event['status'], 4)
        self.assertEqual(event['details'], ['Insufficient credits for [REDACTED_EMAIL]'])

    def test_signed_urls_credentials_and_unbounded_messages_do_not_leak(self):
        message = sanitize_provider_message('Error token=private Bearer abc123 https://provider.example/video?token=secret ' + 'x' * 1000)
        self.assertNotIn('private', message)
        self.assertNotIn('abc123', message)
        self.assertNotIn('token=secret', message)
        self.assertLessEqual(len(message), 500)


if __name__ == '__main__':
    unittest.main()
