"""Serialize actual faster-whisper evidence without changing the default API."""


def transcribe_with_evidence(model, path, language=None, word_timestamps=False):
    segments, info = model.transcribe(
        path, language=language, beam_size=5, vad_filter=True,
        word_timestamps=word_timestamps,
    )
    # faster-whisper is lazy: consume the generator exactly once.
    segments = list(segments)
    result = {
        "success": True,
        "text": " ".join(s.text.strip() for s in segments if s.text.strip()).strip(),
        "language": info.language,
        "language_probability": getattr(info, "language_probability", 1.0),
        "duration": round(info.duration, 2),
        "provider": "hetzner_local_whisper",
    }
    if word_timestamps:
        result["segments"] = [
            {"text": s.text, "start": s.start, "end": s.end} for s in segments
        ]
        result["words"] = [
            {"word": w.word, "start": w.start, "end": w.end,
             "probability": w.probability}
            for s in segments for w in (s.words or [])
        ]
    return result
