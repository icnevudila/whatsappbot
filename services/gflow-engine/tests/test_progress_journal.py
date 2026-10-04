import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from progress_journal import ProgressJournal, read_progress, journal_path


class ProgressTests(unittest.TestCase):
    def test_physical_identity_precedes_generation_and_replay_is_rejected(self):
        with tempfile.TemporaryDirectory() as base:
            journal = ProgressJournal(base, 'org', 'job', 'attempt')
            journal.emit('OPENING_PROJECT')
            journal.emit('ATTACHING_INGREDIENTS', flow_project_id='project')
            with self.assertRaises(ValueError):
                journal.emit('INGREDIENTS_VERIFIED', verified_assets=[])
            journal.emit('INGREDIENTS_VERIFIED', verified_assets=[{'attached_media_id':'one'}, {'attached_media_id':'two'}])
            journal.emit('GENERATING')
            journal.emit('GENERATING')
            events = read_progress(base, 'org', 'job', 'attempt')
            self.assertEqual(len(events), 4)
            self.assertEqual([e['sequence'] for e in events], [1,2,3,4])
            self.assertEqual(read_progress(base, 'other-org', 'job', 'attempt'), [])
            with self.assertRaises(ValueError):
                ProgressJournal(base, 'org', 'job', 'attempt')

    def test_paths_and_incomplete_writes_fail_closed(self):
        with tempfile.TemporaryDirectory() as base:
            with self.assertRaises(ValueError):
                journal_path(base, '../escape', 'job', 'attempt')
            journal = ProgressJournal(base, 'org', 'job', 'attempt')
            with self.assertRaises(ValueError):
                journal.emit('GENERATING')
            journal.emit('OPENING_PROJECT')
            with journal.path.open('a') as file:
                file.write('{"incomplete":')
            self.assertEqual(len(read_progress(base, 'org', 'job', 'attempt')), 1)


if __name__ == '__main__':
    unittest.main()
