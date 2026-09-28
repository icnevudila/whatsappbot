import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from driver import verify_generation_profile_identity


class GenerationProfileIdentityTests(unittest.TestCase):
    def test_missing_manifest_fails_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            result = verify_generation_profile_identity(Path(directory), "owner@example.com")
            self.assertFalse(result["verified"])
            self.assertEqual(result["code"], "FLOW_PROFILE_UNVERIFIED")

    def test_wrong_account_never_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".mesajify_profile_sync.json"
            path.write_text(json.dumps({"verified": True, "email": "other@example.com"}), encoding="utf-8")
            result = verify_generation_profile_identity(Path(directory), "owner@example.com")
            self.assertFalse(result["verified"])
            self.assertEqual(result["code"], "FLOW_ACCOUNT_MISMATCH")

    def test_verified_matching_account_passes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".mesajify_profile_sync.json"
            path.write_text(json.dumps({"verified": True, "email": "Owner@Example.com"}), encoding="utf-8")
            result = verify_generation_profile_identity(Path(directory), "owner@example.com")
            self.assertTrue(result["verified"])
            self.assertEqual(result["email"], "owner@example.com")


if __name__ == "__main__":
    unittest.main()
