import unittest
from types import SimpleNamespace as N
from word_timing import transcribe_with_evidence


class TimingTests(unittest.TestCase):
    def test_actual_generator_words_and_default_compatibility(self):
        class Model:
            def transcribe(self, path, **kwargs):
                self.kwargs = kwargs
                return iter([N(text=" İnceleyin.", start=.5, end=5.25,
                               words=[N(word=" İnceleyin.", start=.6, end=5.2,
                                        probability=.91)])]), N(language="tr", duration=8.01)
        model = Model()
        plain = transcribe_with_evidence(model, "owned.mp4")
        self.assertNotIn("words", plain)
        self.assertFalse(model.kwargs["word_timestamps"])
        actual = transcribe_with_evidence(model, "owned.mp4", word_timestamps=True)
        self.assertTrue(model.kwargs["word_timestamps"])
        self.assertEqual(actual["text"], "İnceleyin.")
        self.assertEqual(actual["words"][0]["end"], 5.2)
        self.assertEqual(actual["segments"][0]["end"], 5.25)

    def test_missing_words_are_not_fabricated(self):
        model = N(transcribe=lambda *a, **kw: (
            iter([N(text="speech", start=.5, end=6, words=None)]),
            N(language="tr", duration=8)))
        self.assertEqual(transcribe_with_evidence(model, "owned", word_timestamps=True)["words"], [])


if __name__ == "__main__":
    unittest.main()
