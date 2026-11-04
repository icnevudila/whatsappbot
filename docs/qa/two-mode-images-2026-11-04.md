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

## Campaign direction correction after user feedback

The user rejected the restrained product-poster interpretation of showstopper. Research references were visually inspected, including:

- [KaBuM Black Friday](https://www.behance.net/gallery/93912591/Black-Friday-KaBuM/modules/542624541): dimensional campaign lettering interacting with product layers.
- [Jafar Ekbal product campaigns](https://dribbble.com/shots/26458694-Social-Media-Post-Design): contrasting type treatments, offer badges, feature/action zones and energetic product staging.
- [Product Social Media Post Design](https://www.behance.net/gallery/211318339/Product-Social-Media-Post-Design): explicit product/offer/CTA hierarchy.

Campaign compilation now has its own energetic retail art direction, while introduction retains the brand-world direction. 3D, controlled glow, overlap and offer/feature callouts are allowed for campaigns. No price, discount, deadline or contact is invented when it was not supplied. A fixed top-headline/center-product/bottom-pill scaffold is explicitly avoided.

23 relevant tests and customer production build passed after this correction. A first live test (job_5ddd4551cc584c03) failed at chat navigation before reference attachment or provider wait; its evidence is retained under `.codex_runtime/bofe-showstopper-retail-v2`. One replacement attempt was submitted after checking the terminal failure, null reference receipt, null provider wait and current healthy/idle engine. Its result must be inspected separately before claiming visual acceptance.


The replacement job job_90934b86b5f7757c completed with two confirmed physical references and a verified 1122x1402 PNG. It demonstrated dimensional type and feature callouts but repeated the headline. Duplicate brief/headline content is now deduplicated before serialization; distinct brief copy remains preserved, with a regression test.

A subsequent real variation, job_b3d475f334fbb29d, requested the pump on the left and type/features on the right. It completed with two confirmed references at 1122x1402. Visual inspection confirmed the requested left-product/right-features composition, a single headline, the logo and actual brand colors, supplied feature copy, and CTA; no price or discount was invented. This demonstrates response to one explicit composition instruction, not a guarantee that arbitrary repeated generations always differ. The generated scene and product are not pixel-identical to the reference photograph. Evidence is in .codex_runtime/bofe-showstopper-retail-v3; the desktop file is 05_Bofe_Gosterisli_Kampanya_Yeni_Yerlesim.png.

The final prompt/receipt/variation suite contains 24 passing tests. These outputs remain prompt/provider examples, not deployed wizard-to-library tests. User acceptance of the revised visual style is still distinct from technical completion.
