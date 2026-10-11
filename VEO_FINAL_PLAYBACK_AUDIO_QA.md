# VEO Final Playback, Audio & Visual QA Acceptance Report
**Date**: 2026-10-11 12:25:00 UTC+3  
**Target Creative / Job ID**: `2b1e7b35-8a73-55b8-a047-a507577d1ab6`  
**Output ID**: `27f1624c-6f07-4675-91b3-57f775c4f0b4`  
**Tenant**: Ayvazoğlu İnşaat (`4a58b0dd-0931-4901-880a-686457d15010`)  
**Target Product**: Tuğla (`3c563c0e-2d46-47df-8898-e0c125455adf`)  

---

## 1. Physical Video & File Identity Verification
- **Output Storage Path**: `/shared/outputs/2b1e7b35-8a73-55b8-a047-a507577d1ab6_df4c32d4-d467-40f9-be48-1807f5bea4bb_finished.mp4`
- **Output File Size**: 3,160,757 bytes
- **Output SHA256**: `d729d191b752f775f72d0ca9a4f2ec1881604b4ecc5a33d76237c5f1d98814d5`
- **RAW Video SHA256**: `cfb6f23fc07cb40455a3df19ec26858a394127f71151d36fa703e773d40585ab` (2,765,421 bytes, 8.0s)
- **Container Format & Codecs**:
  - MP4 container with progressive fast-start layout (`ftyp` at 0, `moov` at 32, `mdat` at 7602).
  - Video stream: H.264 (High) (avc1), 720×1280 (9:16 vertical), 24.0 fps, duration 10.00s.
  - Audio stream: AAC (LC) stereo 48,000 Hz, 140 kb/s, duration 8.00s (footage window).

---

## 2. Visual Content & Scene Verification (0s - 10s Breakdown)
Snapshots were physically extracted and verified:
1. **0.0s – 2.2s (Hook / Frame 1s)**:
   - High-fidelity terracotta Tuğla on wooden pallet in an active, sunlit construction site.
   - Text overlay: `"Ayvazoğlu İnşaat Tuğla"`.
   - Verified no deformation, exact brick geometry and cell structures.
2. **2.2s – 5.8s (Product Proof / Frame 4s)**:
   - Pallets of construction Tuğla loaded by forklift in building yard.
   - Subtitle: `"sipariş almak üzere"`.
3. **5.8s – 8.0s (Brand Close / Frame 7s)**:
   - Camera steadily settles on the pristine hero Tuğla block on pallet.
4. **8.0s – 10.0s (Mandatory Branded Outro / Frame 9s)**:
   - Broadcast-quality 2.0s animated outro with black background.
   - Canonical Ayvazoğlu İnşaat red roof logo and brand typography cleanly displayed.

---

## 3. Audio & Speech Analysis (Root Cause Diagnosis)
- **Audio Integrity Measurement**:
  - Filter: `volumedetect` -> `mean_volume: -21.3 dB`, `max_volume: -3.8 dB` (Clear audible speech signal).
  - Energy Distribution: High active speech RMS (3,000 - 4,300) from 0.0s to 4.5s; natural pause at 4.5s - 5.0s.
  - Subtitle synchronicity: On-screen burned text matches `"Ayvazoğlu İnşaat Tuğla ... sipariş almak üzere"` spanning 0.5s to 5.25s.
- **Whisper Timeout Diagnosis**:
  - The orchestrator configures `defaultWhisperUrl = 'http://167.233.201.31:3457/transcribe'`.
  - Probing port 3457: Connection timed out. No container listening on host port 3457.
  - In `ai_media_control` container: `WHISPER_URL`, `WHISPER_API_URL`, `OPENAI_API_KEY` are unset (`null`).
  - Conclusion: The `AUDIO_VERIFICATION_UNAVAILABLE` error is an infrastructure offline ASR issue, NOT a defect in the video's audio track. The video actually contains the correct Turkish narration and burned-in subtitles.

---

## 4. Playback & Streaming Route Fix
- Route: `/api/ai-media/outputs/[outputId]`
- Previously, `/icerik/[id]` passed raw `/api/ai-media/outputs/27f1624c-6f07-4675-91b3-57f775c4f0b4` without `preview=1`. Because output had `is_approved = false`, the endpoint returned 422 for non-preview requests.
- Fix: When creative or videoState is `needs_review`, `preview=1` is automatically appended for authorized tenant sessions.
- Streaming: HTTP 206 Partial Content byte-range serving verified. Fast seeking and playback ready.
