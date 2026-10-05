import asyncio
import contextlib
import io
import json
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from provider_failure_diagnostics import observe_terminal_failure, sanitize_provider_message


class FailureDiagnosticsTests(unittest.TestCase):
    def test_successful_and_running_records_do_not_touch_the_page(self):
        for status in (2, 3, 6):
            record = SimpleNamespace(status=status, is_done=status == 3, is_running=status in (2, 6))
            self.assertIs(asyncio.run(observe_terminal_failure(None, record)), record)

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
