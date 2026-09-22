# Video Quality QA Scorecard & Evaluation Protocol

This document defines the quantitative evaluation rubrics, fail-closed invariant gates, three-frame inspection protocols, and reference fidelity tests for Google Flow and Veo video productions.

---

## 1. Governance & Separation of Concerns

```
┌────────────────────────────────────────────────────────┐
│               VIDEO ARTIFACT DELIVERED                 │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
      ┌───────────────────────────────────────────┐
      │     8 FAIL-CLOSED INVARIANT GATES         │
      │  (Security, Brand Safety, Correct Asset)  │
      └─────────────────────┬─────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            │                               │
       ANY GATE FAILS                ALL GATES PASS
            │                               │
            ▼                               ▼
┌────────────────────────┐      ┌────────────────────────┐
│  IMMEDIATE REJECTION   │      │  18-DIMENSION CREATIVE │
│ (Delivery Halted,      │      │       SCORECARD        │
│  Zero Customer Reveal) │      │   (0–180 Point Range)  │
└────────────────────────┘      └───────────┬────────────┘
                                            │
                                            ▼
                                ┌────────────────────────┐
                                │ FINAL DELIVERY VERDICT │
                                │ (Score >= 144 / 80%)   │
                                └────────────────────────┘
```

> [!IMPORTANT]
> **Creative score never overrides security invariants.**  
> A visually stunning video that displays the wrong client's logo or turns a tractor into a sports car is **immediately rejected**.

---

## 2. The 8 Fail-Closed Invariant Gates

Every output must pass all 8 gates with a boolean `PASS`. If any gate evaluates to `FAIL`, `delivery_eligible` becomes `false`:

| Gate Identifier | Description & Condition of Immediate Failure | Automatic Action |
|---|---|---|
| **`WRONG_PRODUCT`** | Generated video features a product from a different category, model, or competitor (e.g. concrete block instead of Ayvazoğlu brick, power drill instead of Bofe cultivator). | ❌ REJECT & HALT |
| **`WRONG_BRAND`** | Video features names, marks, or color combinations associated with competitor or unrelated brands. | ❌ REJECT & HALT |
| **`FOREIGN_TENANT_ASSET`** | Video incorporates image, vector, or audio assets belonging to a different tenant organization ID (`org_id`). | ❌ REJECT & HALT |
| **`MISSING_REQUIRED_REFERENCE`** | Brief requires reference image grounding, but generation proceeded without binding the input asset tensor. | ❌ REJECT & HALT |
| **`INVALID_OUTPUT`** | Video container is corrupted, duration $< 3$ seconds, black screen frames $> 10\%$, or missing audio track when required. | ❌ REJECT & HALT |
| **`BROKEN_VIDEO`** | Severe rendering anomalies: persistent frame tears, green encoding flashes, strobe flickering $> 5\text{Hz}$. | ❌ REJECT & HALT |
| **`WRONG_LOGO`** | Rendered logo is AI-hallucinated with incorrect spelling, missing glyphs, distorted iconography, or unapproved version. | ❌ REJECT & HALT |
| **`VALIDATION_BYPASS`** | Any attempt to skip pre-render contracts, bypass visual QA gates, or force delivery without scorecard generation. | ❌ REJECT & HALT |

---

## 3. Reference Fidelity Evaluation Protocol

When a product reference image is provided, the rendered video product is inspected against the ground truth reference asset across 8 physical parameters:

1. **Ana Renk (Primary Color CIELAB $\Delta E$)**:
   - Sample dominant diffuse color of rendered product vs reference image.
   - Threshold: $\Delta E \le 12.0$ (acceptable natural lighting variation). $\Delta E > 20.0$ fails.
2. **Siluet (Silhouette IoU)**:
   - Extract product segmentation mask in static or frontal keyframe.
   - Compute Intersection over Union (IoU) with reference contour. Acceptable $\ge 0.70$.
3. **Oran (Dimensional Aspect Ratio)**:
   - Width-to-height ratio of product components must remain within $\pm 10\%$ of reference.
4. **Düğmeler / Kontroller / Aksamlar (Controls & Fasteners)**:
   - Dials, nozzles, tines, hinges, or buttons must maintain relative position and count.
   - Hallucinated floating levers or disappearing mechanical joints penalize heavily.
5. **Paket Formu (Packaging Form)**:
   - Rigid containers (bottles, boxes, cans, bricks) must maintain planar or cylindrical integrity without gelatinous wobbling.
6. **Ayırt Edici Özellikler (Distinctive Feature Retention)**:
   - Signature brand grooves, acoustic holes, embossed ribs, or thermal vents must be visible.
7. **Logo Konumu (Logo Placement Accuracy)**:
   - If physically stamped on product, logo must not mirror, invert, or migrate across surfaces.
8. **Model Dönüşüm Tespiti (Model Morph Detection — CRITICAL)**:
   - **Invariant**: If generative AI morphs the product into a completely different product class (e.g. brick $\rightarrow$ wood panel, tractor $\rightarrow$ car wash), this triggers an automatic **`WRONG_PRODUCT` Gate Failure**.

---

## 4. Three-Frame QA Sampling Protocol

### Short Videos (8–15s)
Sample exactly 3 frames based on normalized time:
- **Frame 1 (10% Timestamp)**:
  - Verify initial hook presentation.
  - Check absence of AI generation startup distortion or blank frames.
- **Frame 2 (50% Timestamp)**:
  - Verify peak kinetic motion stability.
  - Check product geometry under active lighting or movement.
- **Frame 3 (90% Timestamp)**:
  - Verify pre-closing clarity, spatial stability, and ready state for deterministic CTA lock-up.

### Long Multi-Scene Videos (30–60s)
For each scene $i$ ($1 \le i \le N$):
- **Frame A (15% of Scene $i$)**: Entrance stability and shot establish.
- **Frame B (50% of Scene $i$)**: Mid-scene action peak.
- **Frame C (85% of Scene $i$)**: Narrative payoff of scene.
- **Scene End Frame ($L_i - 1$)**: Saved as canonical visual artifact.
  - For continuous scene transitions, compare `Scene_i.end_frame` with `Scene_{i+1}.start_frame`.
  - Check for jarring lighting temperature jumps, character clothing changes, or camera axis violations ($180^\circ$ rule).

---

## 5. 18-Dimension Creative Scorecard

Each dimension is scored objectively on a scale of **0 to 10** (10 = broadcast commercial standard). Total maximum score: **180 points**. Minimum passing delivery score: **144 points (80%)**.

```
Score: 9–10: Broadcast Quality | 7–8: Solid Commercial Grade | 5–6: Minor Flaws | 0–4: Unacceptable
```

| Dimension | Evaluation Criteria |
|---|---|
| **1. `PRODUCT_IDENTITY`** | Instant recognizability of the brand's exact product model without ambiguity. |
| **2. `PRODUCT_GEOMETRY_STABILITY`** | Rigidity of physical edges, lack of gelatinous warping, stretching, or melting. |
| **3. `BRAND_CONTEXT_MATCH`** | Context aligns with brand mission (e.g. agricultural equipment in farmland, bricks on architectural site). |
| **4. `ENVIRONMENT_MATCH`** | Environmental realism: lighting direction, atmospheric haze, surface textures, weather physics. |
| **5. `REFERENCE_FIDELITY`** | Close visual correspondence to reference photos in materials, proportions, and accents. |
| **6. `CHARACTER_CONTINUITY`** | Human actors (if present) maintain consistent face, hair, body shape, and wardrobe across shots. |
| **7. `SCENE_CONTINUITY`** | Logical spatial and temporal progression from one shot to the next. |
| **8. `CAMERA_QUALITY`** | Cinematic framing, smooth motion vectors (pan/dolly/crane), proper depth of field, lack of erratic jitter. |
| **9. `MOTION_REALISM`** | Physical plausibility of gravity, momentum, vehicle inertia, fluid dynamics, and dust. |
| **10. `LIGHTING`** | Consistent key/fill/rim lighting setups, believable shadows, and color temperature. |
| **11. `COMPOSITION`** | Rule of thirds, golden ratio, headroom, and clear focal visual hierarchy. |
| **12. `PROMPT_ADHERENCE`** | Precise execution of requested actions, camera angles, and mood specified in the brief. |
| **13. `TEXT_ARTIFACTS`** | Absence of hallucinated alien typography, blurry watermarks, or pseudo-lettering in the AI plate. |
| **14. `FOREIGN_BRAND_DETECTION`** | Zero incidental presence of competitor logos, car brands, or trademarked symbols. |
| **15. `FORBIDDEN_OBJECT_DETECTION`** | Zero occurrence of blacklisted objects defined in test cases (e.g. car wash for Bofe). |
| **16. `STORY_COHERENCE`** | Clear beginning, middle, and payoff; narrative meaning clear even on mute. |
| **17. `VOICEOVER_COHERENCE`** | Voice-over timing matches visual beats; clean cadence; zero semantic repetition. |
| **18. `CTA_QUALITY`** | Clean, legible closing frame with official logo, contrast-compliant text, valid URL/phone. |

---

## 6. Scorecard Decision Summary & Delivery Verdicts

- **`DELIVERABLE`**: All 8 Fail-Closed Gates = `PASS` AND Total Score $\ge 144 / 180$ ($\ge 80\%$).
- **`REJECTED_GATE_FAILURE`**: Any Fail-Closed Gate = `FAIL`. Immediate halt, logs preserved.
- **`REJECTED_LOW_SCORE`**: All Gates = `PASS`, but Total Score $< 144 / 180$. Triggers automated regeneration with adjusted prompt strategy.
- **`NEEDS_MANUAL_REVIEW`**: Total Score between 135 and 143 (borderline quality).
