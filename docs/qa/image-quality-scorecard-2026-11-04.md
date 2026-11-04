# Image quality acceptance — 4 November 2026

User target: 10/10 image quality for both introduction and showstopper campaign, followed by cross-brand trials and pushing both modes. Scores are subjective visual judgments; technical completion never establishes this target by itself.

## Fixed rubric (0–2 points each)

1. Product/offering identity and physical fidelity; no invented model or capabilities.
2. Brand/logo/palette specificity, with legible unmodified identity.
3. Distinctive commercial idea appropriate to this business.
4. Typography, hierarchy and readability at mobile viewing size.
5. Action clarity and compositional craft.

10: best-in-class, no meaningful visible defect. 9: excellent with a small identifiable limitation. 8: polished, with minor but visible nits. 7: competent with noticeable flaws. Do not round upward to reach the target.

Benchmarks: the user's Desktop/veriburada medya collection for brand introductions; KaBuM and Jafar Ekbal examples linked in two-mode-images-2026-11-04.md for campaigns. References guide quality and hierarchy, not reproduction of third-party identities.

## Independent review

A fresh visual reviewer inspected the candidate and reference images directly, using the same rubric without receiving the desired total or prior score. It performs no edits or generations.

| Candidate | Identity | Brand | Idea | Typography | Craft/action | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Bofe retail v3 | 1.7 | 1.9 | 1.3 | 1.4 | 1.6 | 7.9 |

Observed defects: reconstructed tank/hose proportions; six equal feature cards; competing depth/diagonal effects and generic laser streaks. Improvement direction: one spray-action idea, canonical front view, one primary benefit and quieter supporting information.

## Evidence policy

Each live candidate retains its exact prompt, Gateway receipt, decoded dimensions, SHA-256 and physical attachment receipt under `.codex_runtime/`. A failed or ambiguous generation is reconciled before another submission. None of these examples establishes deployed wizard-to-library behavior. Video generation remains outside this image acceptance pass.

## Continued independent reviews

- Candidate A (.codex_runtime/bofe-campaign-quality-a): 8.55/10, all six facts present; clearer but still a polished catalog advertisement.
- Candidate B (.codex_runtime/bofe-campaign-quality-b): 8.6/10 visually, REJECTED because five of six required facts were missing.
- Candidate C (.codex_runtime/bofe-campaign-quality-c): 7.45/10, all facts restored but redundant paragraph, altered logo treatment and dense copy.
- Candidate D (.codex_runtime/bofe-campaign-quality-d): 8.5/10, all six facts present and stronger spray/16L idea; capacity repeated four times and feature text remains small.
- Candidate E job_8529e7b93543c817 (.codex_runtime/bofe-campaign-quality-e): already submitted before the user asked to conserve quota; reconcile its existing receipt and output, do not submit it again.

Latest compiler separates exact user-facing copy/commerce values from required product facts, so descriptions can be grouped without dropping distinct information or printing redundant full paragraphs. Original logo rendering and product proportions are explicitly protected. The 24-test targeted suite passed after this data-model change. A fresh full build of the exact final snapshot remains for the receiving agent.

User explicitly authorized locking this checkpoint, making recoverable backups, and handing continuation/live deployment to Antigravity. The numerical 10/10 target has NOT been reached. Do not represent this checkpoint as accepted production quality.
