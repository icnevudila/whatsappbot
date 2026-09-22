# Short Video Benchmark Specification (8–15s Commercials)

This benchmark establishes objective quality standards, reference grounding rules, and prompt execution criteria for short-form advertisements (8–15 seconds).

---

## 1. Test Categories & Target Horizons

Short-form video commercials demand immediate visual impact, rapid brand recognition, and absolute product fidelity within narrow time windows:

| Category | Typical Duration | Dominant Aspect Ratio | Primary Objective |
|---|---|---|---|
| **`product_hero`** | 10–12s | 9:16 (Reels/Shorts/TikTok) | Product showcase with iconic lighting and dynamic rotation. |
| **`cinematic_product`** | 12–15s | 9:16 / 16:9 | High-production value, anamorphic lens feel, shallow depth of field. |
| **`demonstration`** | 10–15s | 16:9 / 9:16 | Product in active operation solving a real domain problem. |
| **`ugc_style`** | 12–15s | 9:16 | Creator point-of-view, handheld natural camera, authentic environment. |
| **`corporate_b2b`** | 10–12s | 16:9 | Software/intelligence showcase, modern boardroom, decision speed. |
| **`food_appetite`** | 8–10s | 9:16 | Extreme sensory appeal, texture, steam, slow-motion detail. |

---

## 2. Test Case Specification Schema

Every short commercial benchmark case is defined by the following contract:

- **`benchmark_id`**: Unique benchmark code (e.g. `SHORT-BOFE-HERO-01`).
- **`brand`**: Test fixture brand.
- **`sector`**: Industry classification.
- **`objective`**: Clear narrative and conversion goal of the commercial.
- **`aspect_ratio`**: Targeted viewport (`9:16` for mobile vertical, `16:9` for landscape).
- **`expected_duration`**: Nominal clip length in seconds (8 to 15s).
- **`required_assets`**: Essential input files (logos, product PNGs, reference photos).
- **`required_logo`**: Visual identity description and placement constraints.
- **`required_product`**: Exact physical appearance, material, and geometric shape.
- **`required_environment`**: Contextual setting required to ground the product.
- **`forbidden_elements`**: Explicit list of hallucinated objects or environments that constitute immediate failure.
- **`recommended_strategy`**: Prompt generation pattern (`Direct_R2V`, `Hero_Keyframe_I2V`, `Keyframe_Explicit_Cinematography`).
- **`success_criteria`**: Measurable thresholds for grounding, motion, and branding.

---

## 3. Test Cases (Benchmark Fixtures)

### Case 1: `SHORT-BOFE-HERO-01` (Agricultural Product Hero)
- **Brand**: Bofe
- **Sector**: Tarım Makineleri / Agriculture Machinery
- **Category**: `product_hero`
- **Objective**: Showcase heavy-duty soil cultivator / sprayer machine in pristine studio-lit field transition, highlighting solid mechanical build and brand reliability.
- **Aspect Ratio**: `9:16`
- **Expected Duration**: 10s
- **Required Assets**:
  - `assets/benchmark/bofe/logo_primary.png`
  - `assets/benchmark/bofe/product_sprayer_hero.png`
- **Required Logo**: Bofe official vector logo with authentic yellow/green brand accents.
- **Required Product**: Bofe industrial agricultural sprayer equipment with distinct yellow tank contour and steel hydraulic arm geometry.
- **Required Environment**: Modern agricultural open field at dawn with tilled dry earth, morning dew, and warm golden rim light.
- **Forbidden Elements**:
  - ❌ Car wash / Otomobil yıkama
  - ❌ Power drill / El matkabı
  - ❌ Handheld domestic tools / Ev tadilat aletleri
  - ❌ Household cleaning / Ev temizliği
  - ❌ Concrete mixer / Beton mikseri
  - ❌ Urban street / Şehir caddesi
- **Recommended Strategy**: `Keyframe_to_I2V` (High composition control ensures machine proportions remain intact).
- **Success Criteria**:
  - Grounding: Machine silhouette and mechanical arm structure identical to reference image (Silhouette IoU $\ge 0.75$).
  - Motion: Smooth forward camera dolly; natural soil dust particles under slow tire rotation.
  - Duration: Exactly 10s ($\pm 1s$).

---

### Case 2: `SHORT-AYVAZOGLU-CINEMATIC-01` (Architectural Masonry)
- **Brand**: Ayvazoğlu
- **Sector**: Yapı Malzemeleri / Architectural Masonry & Bricks
- **Category**: `cinematic_product`
- **Objective**: Cinematic low-angle tracking shot of premium architectural red clay bricks stacked in precision geometric pattern on a contemporary construction site.
- **Aspect Ratio**: `9:16`
- **Expected Duration**: 12s
- **Required Assets**:
  - `assets/benchmark/ayvazoglu/logo_white.png`
  - `assets/benchmark/ayvazoglu/brick_terracotta_stack.png`
- **Required Logo**: Ayvazoğlu Tuğla official typography logo.
- **Required Product**: Terracotta architectural clay brick with precision rectangular edges, internal acoustic cavities, and natural terracotta clay porous texture.
- **Required Environment**: Contemporary high-end architectural building site with clean concrete, scaffolding accents, and golden hour lighting.
- **Forbidden Elements**:
  - ❌ Consumer electronics / Tüketici elektroniği
  - ❌ Food items / Gıda ürünleri
  - ❌ Plastic toys / Plastik oyuncaklar
  - ❌ Indoor living room / Oturma odası
  - ❌ Farm animals / Çiftlik hayvanları
  - ❌ Car repair shop / Oto tamirhanesi
- **Recommended Strategy**: `Direct_R2V`
- **Success Criteria**:
  - Grounding: Exact terracotta brick red-orange hue ($\Delta E \le 10.0$); rectangular planar stability preserved without melting.
  - Motion: Smooth orbital camera move with shallow depth of field.
  - Duration: $12s \pm 1s$.

---

### Case 3: `SHORT-BOFE-DEMO-02` (Agricultural Field Demonstration)
- **Brand**: Bofe
- **Sector**: Tarım Makineleri / Agriculture Machinery
- **Category**: `demonstration`
- **Objective**: Demonstrate the precision mist discharge of the Bofe orchard spraying rig moving steadily between rows of fruit trees.
- **Aspect Ratio**: `16:9`
- **Expected Duration**: 10s
- **Required Assets**:
  - `assets/benchmark/bofe/logo_primary.png`
  - `assets/benchmark/bofe/sprayer_orchard_nozzle.png`
- **Required Logo**: Bofe official logo.
- **Required Product**: Bofe orchard fan sprayer attachment hitched to agricultural tractor.
- **Required Environment**: Symmetrical orchard grove with apple or olive trees, sunny afternoon, clear blue sky.
- **Forbidden Elements**:
  - ❌ Pressure car washer / Oto basınçlı yıkama
  - ❌ Fire hose / Yangın hortumu
  - ❌ Indoor bathroom plumbing / Banyo sıhhi tesisatı
  - ❌ Mining drill / Maden matkabı
- **Recommended Strategy**: `Keyframe_Explicit_Cinematography`
- **Success Criteria**:
  - Grounding: Fan housing, nozzle arc, and tank maintain rigid geometry during active spray mist generation.
  - Fluid Dynamics: Realistic atomized water mist dispersing symmetrically through orchard tree branches.

---

### Case 4: `SHORT-VERIBURADA-B2B-01` (B2B SaaS Data Intelligence)
- **Brand**: Veri Burada
- **Sector**: Kurumsal Veri Zekası / Enterprise SaaS
- **Category**: `corporate_b2b`
- **Objective**: Highlight data intelligence platform on executive glass screens in a high-tech corporate operations center, communicating security and real-time enterprise insights.
- **Aspect Ratio**: `16:9`
- **Expected Duration**: 10s
- **Required Assets**:
  - `assets/benchmark/veriburada/logo_cyan.png`
  - `assets/benchmark/veriburada/dashboard_kpi_screen.png`
- **Required Logo**: Veri Burada corporate emblem and minimalist sans-serif wordmark.
- **Required Product**: Veri Burada analytics intelligence suite interface displayed on ultra-thin ergonomic monitors and holographic glass board.
- **Required Environment**: Modern enterprise analytics boardroom or operations command room with soft ambient blue lighting, architectural glass, and city skyline view.
- **Forbidden Elements**:
  - ❌ Outdoor farm / Açık tarla
  - ❌ Heavy construction machinery / Ağır iş makineleri
  - ❌ Kitchen / Mutfak
  - ❌ Comic cartoons / Karikatürler
- **Recommended Strategy**: `Hero_Keyframe_I2V`
- **Success Criteria**:
  - Grounding: Dashboard charts retain clean rectilinear UI boundaries; zero alien glyph melting.
  - Motion: Smooth slow dolly-out revealing executive focus and modern corporate architecture.

---

### Case 5: `SHORT-TESTBRAND-UGC-01` (Cosmetics UGC Style)
- **Brand**: AuraGlow (Generic Beauty Fixture)
- **Sector**: Kozmetik / Skincare
- **Category**: `ugc_style`
- **Objective**: Authentic creator POV unboxing and applying organic vitamin C serum in naturally lit bathroom setting with enthusiastic authentic pacing.
- **Aspect Ratio**: `9:16`
- **Expected Duration**: 15s
- **Forbidden Elements**: Industrial hardware, tractors, dirty garages, distorted human fingers (must have 5 anatomically natural fingers).

---

### Case 6: `SHORT-TESTBRAND-FOOD-01` (Artisan Bakery Appetite Appeal)
- **Brand**: ArtisanBakery (Generic Food Fixture)
- **Sector**: Gıda / Food & Beverage
- **Category**: `food_appetite`
- **Objective**: Appetizing slow-motion reveal of freshly baked sourdough bread being pulled apart, showing steaming airy crumb and golden crispy crust.
- **Aspect Ratio**: `9:16`
- **Expected Duration**: 8s
- **Forbidden Elements**: Plastic wrapping, machinery grease, electronic screens, synthetic neon colors.

---

## 4. Three-Frame Sampling Protocol

For any short video of length $T$ seconds:

```
0s ────── [ 10% (0.10*T) ] ────── [ 50% (0.50*T) ] ────── [ 90% (0.90*T) ] ────── Ts
             Frame A                  Frame B                  Frame C
            (Hook QA)             (Stability QA)             (Payoff QA)
```

1. **Frame A (10% timestamp)**:
   - Verifies the **Hook**.
   - Product or subject must be introduced without initial glitch, frame tear, or blur burst.
2. **Frame B (50% timestamp)**:
   - Verifies **Geometric Stability**.
   - In peak motion, the product must retain rigid structural lines, correct aspect ratio, and no morphing into alien objects.
3. **Frame C (90% timestamp)**:
   - Verifies **Payoff & Brand Clarity**.
   - Final product state, background continuity, and readiness for deterministic CTA composition.
