# Video Engine Production Baseline (2026-10-05)

## Baseline Summary

- **BASELINE_NAME**: `video-engine-production-baseline-v1`
- **STATUS**: `VIDEO_PRODUCTION_BASELINE_LOCKED`
- **VIDEO_ENGINE_FROZEN**: `YES`
- **BACKUP_BRANCH**: `backup/video-engine-baseline-2026-10-05`
- **TAG**: `video-engine-baseline-v1-2026-10-05`

---

## Production Contracts

### 1. RAW_VEO_CONTRACT
- **Duration**: Exactly 8.00 seconds.
- **Aspect Ratio**: 9:16 vertical (720x1280).
- **Structure**: 3 commercial beats connected by 2 motivated cuts:
  - **Beat 1 (0.0s – 2.2s)**: HOOK — establishing subject and real context.
  - **Beat 2 (2.2s – 5.8s)**: FUNCTION / PROOF — active mechanism and material interaction.
  - **Beat 3 (5.8s – 8.0s)**: HERO CLOSE — static locked-off macro packshot on canonical product.
- **Reference Binding**: Strict 2/2 reference invariant (`product` and `logo` attached and verified).
- **Audio**: Single native Turkish commercial narration (0.5s – 5.25s) with background music and ambient foley.
- **Typography Policy**: Raw Veo footage is 100% clean of generative promotional typography.

### 2. POSTPRO_CONTRACT
- **Subtitles**: Deterministic CapCut-style kinetic subtitles with word-by-word neon yellow highlight, strictly aligned to the 0.5s–5.25s speech window without drift.
- **Outro Timing**: Starts at 8.00s via seamless video padding (`+2.00s`). Raw video footage plays 100% uncut.
- **Outro Content**:
  - Centered canonical company logo.
  - Brand headline (clean white, fontsize 36).
  - Product / Slogan subhead (cool slate, fontsize 24).
  - Contact information (phone / website, only when supplied).
  - Verified Call-To-Action (gold accent `#FFD700`, fontsize 26).
- **Audio in Outro**: Speech-free; ambient background track continues naturally to 10.00s.

### 3. FINAL_MASTER_CONTRACT
- **Duration**: Exactly 10.00 seconds (8.00s raw Veo + 2.00s branded outro).
- **Aspect Ratio**: 9:16 vertical (720x1280).
- **Primary Delivery**: The 10.00s master is published as `<jobId>.mp4` and `<jobId>_finished.mp4`.
- **Integrity**: ffprobe validated, SHA-256 verified, visually reviewed.

---

## Real Smoke Tests Verification

| Test Case | Sector | Environment | Raw SHA-256 | Master Duration | Final SHA-256 | Visual Result |
|-----------|--------|-------------|-------------|-----------------|---------------|---------------|
| **1. Bofe 16L Akülü Sırt Pompası** | Tarım / Bahçe | Modern cam sera | `64428d8e...` | 10.00s | `293ad6a524f8ca40a975a9d0bf8dd34a9022cd9b526cafce47694c6b18410b87` | **PASS (100%)** |
| **2. Ayvazoğlu Yapı Tuğlası** | İnşaat / Malzeme | Aktif inşaat şantiyesi | `8a9c8f0b...` | 10.00s | `45bf59aa6e8ee6431c04086f84e4d3c12e32379e976c0ba03feb55261637ddfa` | **PASS (100%)** |
| **3. Aura Botanica Yüz Serumu** | Kozmetik / Cilt | Aydınlık modern banyo | `99edc81c...` | 10.00s | `84f74902ea5e38c3668baf7634b247e3325b281fdd89ecb2e528e75da46c2f30` | **PASS (100%)** |

### Visual Checklist (All 3 Passed):
- `WORLD_CORRECT = PASS` (Greenhouse, construction jobsite, and modern bathroom correctly isolated without cross-contamination).
- `PRODUCT_FORM_CORRECT = PASS` (Backpack sprayer worn on back, hollow clay brick carried on jobsite, cosmetic dropper bottle held in hand).
- `FUNCTION_CORRECT = PASS` (Micronized foliage misting, structural masonry handling, liquid dropper skin application).
- `SHOT_1_DISTINCT = PASS` (0.0–2.2s low-angle tracking shot).
- `SHOT_2_DISTINCT = PASS` (2.2–5.8s tight macro functional action shot).
- `SHOT_3_DISTINCT = PASS` (5.8–8.0s static macro hero packshot).
- `HERO_CLOSE_CORRECT = PASS` (Rock-steady 2.2s camera hold on authentic product).
- `PRODUCT_IDENTITY_DRIFT = PASS` (Zero shape deformation or accessory morphing).
- `BRAND_DRIFT = PASS` (Authentic reference brand marks preserved AS-IS).

---

## Known Limitations

- Subtitle word-level synchronization uses canonical speech window estimation (0.5s–5.25s) with deterministic pacing when faster-whisper word-level timestamps are not cached.
- Video extension uses FFmpeg `tpad` and `fade` filters requiring compatible libx264 encoding.

---

## Rollback Reference

In the event of an unexpected regression, rollback to this frozen state using:

```bash
git checkout backup/video-engine-baseline-2026-10-05
# or by tag
git checkout video-engine-baseline-v1-2026-10-05
```
