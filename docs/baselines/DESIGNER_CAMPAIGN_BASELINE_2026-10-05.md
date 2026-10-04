# Mesajify Designer Campaign Baseline (2026-10-05)

## 1. Baseline Identity
- **BASELINE_NAME**: `designer-campaign-baseline-2026-10-05`
- **DATE**: 2026-10-05
- **ENGINE_STATUS**: `DESIGNER_ENGINE_FROZEN = YES`
- **BENCHMARK_ARTIFACT**: `bofe_variant_A2_refined.png` (Job ID: `job_c2b493c799d0ecdb`, SHA256: `8734f02a1d9ea6eca29d21e7de0cff5e4e5395a65770e4fa5a3139183e618262`)
- **BACKUP_BRANCH**: `backup/designer-campaign-baseline-2026-10-05`
- **RELEASE_TAG**: `designer-campaign-baseline-v1-2026-10-05`

---

## 2. Approved Characteristics (Locked Production Behavior)
The Designer / Image Engine is frozen at the A2 benchmark level:

1. **Physical Product Dominance (60-70% visual share)**:
   - Product is physically integrated into context-appropriate environments (soil, mist, workshop, marble table, architectural concrete).
   - Realistic contact shadows, authentic reflections, perspective alignment.
   - Eliminates "flat sticker cut-out pasted onto vector background" appearance.

2. **Autonomous Custom Art-Direction (Anti-Canva Template)**:
   - Dynamic layouts emerging naturally from product geometry and sector characteristics (diagonal dynamism, edge-breaking crops, asymmetric staging).
   - Strictly eliminates repetitive template modules:
     - No circular starburst discount sticker packs.
     - No repeated 3-icon feature rows.
     - No boxed price cards.
     - No repeated bottom footer bars.

3. **Restrained Commercial Hierarchy**:
   - Element budget capped at 2 to 4 strongest commercial anchors:
     1. High-contrast bold commercial Turkish headline.
     2. Strict price hierarchy (e.g. `220 TL` dominant, `280 TL` crossed out / was).
     3. Discount capsule / pill badge in brand accent.
     4. Integrated non-button campaign call-to-action or phone contact cue.

4. **Sector World Grounding**:
   - `Tarım & Bahçe`: Orchard/field integration, morning daylight, fine mist.
   - `İnşaat & Yapı Malzemeleri`: Architectural concrete, warehouse logistics, slate.
   - `Restoran & Gıda`: Dominant food photography (70%+), warm ambient appetizing light, crisp textures.
   - `Çiçekçilik & Butik`: Soft editorial boutique light, clean white/pastel aesthetic, refined typography.
   - `Ağır Sanayi & Endüstri`: Precision engineering macro, brushed steel, workshop bokeh.

5. **Reference Fidelity & Guardrails**:
   - Mandatory reference pair: Canonical product photo + authentic company logo.
   - Strict negative prompts: no fake clickable web buttons, no cartoon stickers, no comic speech bubbles, no invented trust badges, no unreadable micro-text.

6. **Separate WhatsApp Campaign Message Pairing**:
   - Autonomous accompanying WhatsApp text generation with verified factual claims, emoji structuring, and contact lines (`apps/customer/src/lib/ai/campaign-message.ts`).

---

## 3. Approved Variation Modes
- **A2 (Default)**: `BALANCED_HIGH_CONVERSION_DEFAULT` — High-impact direct-response campaign with restrained, premium typography and realistic environmental depth.
- **A (Option)**: `AGGRESSIVE_RETAIL_OPTION` — High-urgency retail campaign look.
- **B (Option)**: `CLEAN_PREMIUM_OPTION` — Minimalist, high-end editorial product presentation.

---

## 4. Known Acceptable Limitations
1. Food & Restaurant Photography (e.g. Usta Döner smoke test) prioritizes culinary freshness and appetite appeal; layout is simpler and less geometrically complex than the agricultural benchmark to avoid cluttering fresh food items.
2. Web provider composer attachment validation requires idle tab state; transient timeouts recover via durable job reconciliation.

---

## 5. Test & Build Verification Results
- **Typecheck (`npx tsc --noEmit -p apps/customer/tsconfig.json`)**: PASS (0 errors).
- **Campaign Engine Regression Suite (`apps/customer/src/lib/creative/campaign-image-engine.test.ts`)**: PASS (8/8 tests ok).
  - 1. Template selection: default to CAMPAIGN_POSTER
  - 2. Campaign data shaping: strips Brand Kit meta labels & shapes facts
  - 3. Price hierarchy & discount handling: verified numbers only
  - 4. Quantity tiers & packaging: preserves boxContents
  - 5. No invented facts: strictly omits unprovided delivery, dates, or badges
  - 6. Reference Contract: historical d350985 phrasing for product and logo
  - 7. No brand-specific runtime hardcodes (unseen arbitrary business test)
  - 8. Separate AI WhatsApp Campaign Message pairing
- **Acceptance Matrix (`verify_acceptance_matrix.js`)**: PASS (5/5 checks passed).
- **Next.js Production Build (`apps/customer`)**: PASS (62/62 static & dynamic routes optimized).
- **Video Bot Engine Main Integration**: 100% PRESERVED (clean fast-forward merge with `origin/main`).

---

## 6. How to Compare with Baseline
Compare any newly generated campaign image against the locked benchmark:
```bash
# Benchmark location:
C:\Users\TP2\Desktop\mesajify_ciktilar\bofe_variant_A2_refined.png
```
Verify the following 7 criteria:
1. `PRODUCT_DOMINANT`: Product occupies 60-70% visual share with realistic grounding.
2. `SECTOR_WORLD_CORRECT`: Appropriate environment and lighting (no agricultural style leaking into food or construction).
3. `BRAND_PERSONALITY_CORRECT`: Colors and font choices respect Brand Kit.
4. `CAMPAIGN_IMPACT`: Immediate mobile direct-response readability under 3 seconds.
5. `MOBILE_READABILITY`: Headline and price legible on phone screens.
6. `NO_CANVA_TEMPLATE_REPETITION`: Non-templated layout tailored to product geometry.
7. `NO_CROSS_SECTOR_STYLE_LEAKAGE`: Distinct sector-driven aesthetics.

---

## 7. Rollback Reference
In the event of an unintended regression, revert to this exact point:
```bash
git checkout designer-campaign-baseline-v1-2026-10-05
# OR
git checkout backup/designer-campaign-baseline-2026-10-05
```
