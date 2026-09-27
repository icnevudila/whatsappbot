import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from capcut_post_production import (
    build_overlay_manifest,
    clean_turkish_punctuation,
    sha256_file,
    to_turkish_upper,
)


class CapCutPostProductionContractTests(unittest.TestCase):
    def test_turkish_typography_is_deterministic(self):
        self.assertEqual(to_turkish_upper("ışık, ölçü ve çağrı"), "IŞIK, ÖLÇÜ VE ÇAĞRI")
        self.assertEqual(clean_turkish_punctuation('"[Kampanya]_metni*"'), "Kampanyametni")

    def test_manifest_records_product_mode_and_provenance(self):
        manifest = build_overlay_manifest(
            creative_type="BRAND_FILM",
            subtitle_segments=[],
            subtitle_mode="off",
            duration_seconds=40,
            source_video_sha256="a" * 64,
            approved_script_sha256="b" * 64,
            timing_provenance={"timing_source": "disabled"},
            product_type="LONG_FORM_VIDEO_V1",
            scene_ids=["scene_01", "scene_02"],
        )
        self.assertEqual(manifest["product_type"], "LONG_FORM_VIDEO_V1")
        self.assertEqual(manifest["duration_seconds"], 40.0)
        self.assertFalse(manifest["subtitle_layer"]["active"])
        self.assertEqual(manifest["scene_ids"], ["scene_01", "scene_02"])

    def test_sha256_is_based_on_bytes(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "sample.bin"
            path.write_bytes(b"mesajify")
            self.assertEqual(sha256_file(str(path)), hashlib.sha256(b"mesajify").hexdigest())


if __name__ == "__main__":
    unittest.main()
