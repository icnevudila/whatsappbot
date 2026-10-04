import hashlib
import tempfile
import unittest
from pathlib import Path
from PIL import Image, ImageDraw
from prepare_outro_logo import prepare


class OutroLogoTest(unittest.TestCase):
    def test_derivative_preserves_source_and_removes_border_only(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.png'
            target = Path(directory) / 'derived.png'
            image = Image.new('RGB', (300, 100), 'white')
            draw = ImageDraw.Draw(image)
            draw.rectangle((30, 30, 270, 70), fill='black')
            draw.rectangle((80, 40, 90, 50), fill='white')
            image.save(source)
            before = hashlib.sha256(source.read_bytes()).hexdigest()
            prepare(source, target)
            self.assertEqual(before, hashlib.sha256(source.read_bytes()).hexdigest())
            result = Image.open(target)
            self.assertEqual(result.mode, 'RGBA')
            self.assertEqual(result.width, 520)
            self.assertLessEqual(result.height, 340)
            self.assertGreater(result.getchannel('A').getextrema()[1], 0)

    def test_opaque_blank_and_tall_fail_without_output(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'source.png'
            target = Path(directory) / 'derived.png'
            for color, error in [('red', 'OPAQUE'), ('white', 'EMPTY')]:
                Image.new('RGB', (100, 100), color).save(source)
                with self.assertRaisesRegex(ValueError, error):
                    prepare(source, target)
                self.assertFalse(target.exists())
            image = Image.new('RGBA', (100, 300), (0, 0, 0, 0))
            ImageDraw.Draw(image).rectangle((20, 20, 80, 280), fill='black')
            image.save(source)
            with self.assertRaisesRegex(ValueError, 'TOO_TALL'):
                prepare(source, target)
            self.assertFalse(target.exists())


if __name__ == '__main__':
    unittest.main()
