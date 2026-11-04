# Two image modes — 4 November 2026

The user requested two image modes, minimal prompting, mandatory logo/brand colors/populated wizard copy, optional product references, and comparison with Desktop/veriburada medya. Video changes are deferred until image review.

## Implementation

- Visible choices: SMART_CAMPAIGN (Marka & Ürün Tanıtımı), SHOWSTOPPER_CAMPAIGN (Gösterişli Kampanya). Old style identifiers remain readable for old records.
- New wizard submissions persist imagePromptVersion=BRAND_KIT_V1. The production compiler uses one compact brief instead of stacking legacy director, software staging and scene templates.
- Logo and valid brand palette are mandatory. Product images are optional for images, including quick product creation. Video reference requirements remain unchanged.
- Parent variations inherit the prompt version and brand context. Owned parent canvases can be used for brand revisions; references still go through the existing owned asset resolver and attachment receipt checks.
- Automatically generated scene directions no longer populate image scene fields. User-written direction remains authoritative for composition; product/logo identity and commercial facts remain protected.
- The brief requests a service-specific visual idea and brand-owned visual world rather than interchangeable stock imagery. Layout remains model-selected. No guarantee that every stochastic output is unique or visually accepted.

## Evidence

23 targeted prompt/asset/variation/provider-contract tests passed. Customer production build passed. Browser fixture verified exactly two style choices and captured `.codex_runtime/two-mode-wizard.png`. This is local UI evidence, not a deployed wizard end-to-end generation.

Real ChatGPT generations used the production prompt compiler, existing Gateway submission/observation helpers and validated physical reference receipts. Final files are 1122×1402 with SHA-256 evidence:

| Candidate | Gateway job | Evidence directory |
| --- | --- | --- |
| Veri Burada introduction, logo only | job_5273493a55dd13b6 | .codex_runtime/two-mode-round4 |
| Mesajify campaign, logo only | job_e5c55b5d71bfcd80 | .codex_runtime/two-mode-round4 |
| Bofe campaign, canonical 16L pump + logo | job_b3fba96c3e9f0abe | .codex_runtime/bofe-product-campaign |

Latest examples were copied to `C:/Users/TP2/Desktop/Mesajify_2_Mod_Ornekler`.

## Visual review and limits

Earlier rounds were rejected: oversized headings/neon strips; then generic desk photographs; Bofe without a product reference invented catalog-like equipment. These are not accepted quality evidence.

Latest Veri Burada depicts city selection becoming rows of businesses, with the logo's ribbon motif. Mesajify depicts campaign work reaching customer groups inside a logo-derived spatial frame. Bofe uses the actual turquoise 16L pump instead of invented machinery. Logo, palette, headline, supporting line, CTA and supplied website were visually inspected. Exact pixel/logo fidelity and exhaustive OCR of every catalog description are not proven by these checks.

Examples are provider/compiled-prompt tests with recorded inputs, not new customer-library records. No production deployment or video generation was performed for this change. Multiple same-brand variations, user acceptance, and live wizard-to-library behavior remain separate acceptance checks.

