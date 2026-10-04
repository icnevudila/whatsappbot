"""Exercise the production hook without importing Playwright startup patches."""
import ast
import os
import unittest
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace


@dataclass(frozen=True)
class Record:
    workflow_id: str
    project_id: str
    media_id: str
    video_url: str | None = None


class GenerationIdentityTests(unittest.TestCase):
    def test_signed_cae_result_keeps_submitted_workflow_and_frozen_record(self):
        source = Path(os.environ.get('GFLOW_PATCH_TEST_SOURCE',
                      str(Path(__file__).resolve().parents[1] / 'sitecustomize.py')))
        tree = ast.parse(source.read_text(encoding='utf-8'))
        hook = next(n for n in ast.walk(tree)
                    if isinstance(n, ast.FunctionDef) and n.name == '_resilient_generation_record')
        submitted = Record('workflow-id', 'project-id', 'media-id')
        completed = Record(submitted.workflow_id, submitted.project_id, submitted.media_id,
                           'https://flow-content.google/video/test')
        class WireFormatError(Exception):
            pass
        namespace = {
            '_orig_generation_record': lambda rpc, payload: completed,
            'be': SimpleNamespace(WireFormatError=WireFormatError),
            # A positional fallback must never replace a valid upstream CAE result.
            '_parse_modern_flow_record': lambda payload: Record('media-id', 'project-id', 'workflow-id'),
        }
        module = ast.Module(body=[hook], type_ignores=[])
        exec(compile(ast.fix_missing_locations(module), str(source), 'exec'), namespace)
        actual = namespace['_resilient_generation_record']('as29s', ['CAE-result'])
        self.assertIs(actual, completed)
        self.assertEqual(actual.workflow_id, submitted.workflow_id)
        self.assertEqual(actual.video_url, completed.video_url)


if __name__ == '__main__':
    unittest.main()
