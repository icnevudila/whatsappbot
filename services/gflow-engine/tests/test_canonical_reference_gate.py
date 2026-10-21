import unittest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from driver import execute_generation_job, FlowExecutionError

class TestCanonicalReferenceGate(unittest.TestCase):
    def test_missing_canonical_references_fails_closed(self):
        payload = {
            "job_id": "test_job_001",
            "attempt_id": "att_001",
            "org_id": "org_test",
            "prompt": "Commercial ad for @BrandLogo with @HeroProduct on table",
            "assets": [], # 0 assets
            "require_canonical_references": True,
        }
        with self.assertRaises(FlowExecutionError) as ctx:
            execute_generation_job(payload)
        self.assertEqual(ctx.exception.code, "INGREDIENT_ATTACHMENT_FAILED")
        self.assertIn("CANONICAL_REFERENCE_PAIR_REQUIRED", ctx.exception.message)

    def test_prompt_with_handles_but_empty_assets_fails_closed(self):
        payload = {
            "job_id": "test_job_002",
            "attempt_id": "att_002",
            "org_id": "org_test",
            "prompt": "Commercial ad showing @HeroProduct in action",
            "assets": [],
        }
        with self.assertRaises(FlowExecutionError) as ctx:
            execute_generation_job(payload)
        self.assertEqual(ctx.exception.code, "INGREDIENT_ATTACHMENT_FAILED")

if __name__ == '__main__':
    unittest.main()
