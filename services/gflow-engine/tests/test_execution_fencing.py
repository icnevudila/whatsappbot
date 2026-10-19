import os
import subprocess
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
_base = tempfile.TemporaryDirectory()
for name in ('FLOW_PROFILES_DIR', 'FLOW_OUTPUTS_DIR', 'FLOW_INCIDENTS_DIR'):
    os.environ.setdefault(name, _base.name)
from driver import ExecutionLeaseMonitor, require_execution_lease, FlowExecutionError
from invocation_identity import InvocationIdentity, IdentityHeld


class ExecutionFencingTests(unittest.TestCase):
    def test_missing_false_malformed_and_unreachable_authority_fail_closed(self):
        def unreachable():
            raise TimeoutError('sensitive request details must not escape')
        for check in (None, lambda: False, lambda: {'ok': True}, unreachable):
            with self.assertRaises(FlowExecutionError) as caught:
                require_execution_lease(check)
            self.assertEqual(caught.exception.code, 'FLOW_INVOCATION_UNCERTAIN')
            self.assertNotIn('sensitive', str(caught.exception))
        require_execution_lease(lambda: True)

    @unittest.skipUnless(os.name == 'posix', 'Production process group behavior requires Linux')
    def test_running_silent_child_and_descendant_stop_after_lease_loss_without_replay(self):
        with tempfile.TemporaryDirectory() as base:
            identity = InvocationIdentity(Path(base) / 'invocations.sqlite3')
            identity.reserve('job', 'org', 'attempt', 'account')
            identity.bind_project('job', 'project')
            identity.mark_submitting('job')
            child = subprocess.Popen([sys.executable, '-c',
                'import subprocess,sys,time; subprocess.Popen([sys.executable,"-c","import time; time.sleep(60)"]); time.sleep(60)'],
                start_new_session=True, stdout=subprocess.PIPE)
            owned = threading.Event()
            owned.set()
            start = time.monotonic()
            try:
                with self.assertRaises(FlowExecutionError):
                    with ExecutionLeaseMonitor(owned.is_set, child, interval=0.02):
                        owned.clear()
                        child.wait(timeout=3)
                self.assertLess(time.monotonic() - start, 3)
                self.assertIsNotNone(child.poll())
                with self.assertRaises(IdentityHeld):
                    identity.reserve('job', 'org', 'attempt', 'account')
                self.assertEqual(identity.db.execute('SELECT state FROM invocations').fetchone()[0], 'SUBMISSION_UNCERTAIN')
            finally:
                child.kill() if child.poll() is None else None
                child.wait()
                child.stdout.close()
                identity.close()

    def test_monitor_finishes_without_waiting_for_interval_when_execution_completes(self):
        with ExecutionLeaseMonitor(lambda: True, None, interval=30) as monitor:
            pass
        self.assertFalse(monitor.thread.is_alive())
        self.assertFalse(monitor.lost.is_set())


if __name__ == '__main__':
    unittest.main()
