import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from invocation_identity import InvocationIdentity, IdentityHeld, IdentityConflict


class InvocationTests(unittest.TestCase):
    def test_durable_identity_fences_resubmission_and_foreign_ownership(self):
        with tempfile.TemporaryDirectory() as base:
            path = Path(base) / 'invocations.sqlite3'
            identity = InvocationIdentity(path)
            identity.reserve('job', 'org', 'attempt', 'account')
            identity.bind_project('job', 'project')
            identity.mark_submitting('job')
            identity.close()
            reopened = InvocationIdentity(path)
            try:
                with self.assertRaises(IdentityHeld):
                    reopened.reserve('job', 'org', 'attempt', 'account')
                with self.assertRaises(IdentityConflict):
                    reopened.reserve('job', 'foreign-org', 'attempt', 'account')
                with self.assertRaises(IdentityHeld):
                    reopened.mark_submitting('job')
                reopened.reserve('second-job', 'org', 'second-attempt', 'account')
                with self.assertRaises(IdentityConflict):
                    reopened.bind_project('second-job', 'project')
            finally:
                reopened.close()


if __name__ == '__main__':
    unittest.main()
