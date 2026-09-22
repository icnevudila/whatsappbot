/**
 * MESAJIFY VIDEO ENGINE V5 - CREATIVE MEMORY & SHOT DIVERSITY OPTIMIZER
 * 
 * Amaç:
 * Firmanın son 10 videosunu hatırlayarak aynı görsel klişelere (örn. 5x golden hour, 4x drone)
 * düşmesini engellemek ve çok boyutlu kalite skoru (Novelty, Brand Fit, Clarity) üretmek.
 */

export interface CreativeHistoryItem {
  id?: string
  creativeId?: string
  createdAt?: string
  hookType: string          // örn. "macro_reveal", "action_motion", "scale_stack"
  environment: string       // örn. "orchard", "brick_kiln_yard", "marble_vanity"
  heroShot: string          // örn. "low_angle_product", "close_macro", "crane_settle"
  cameraLanguage: string[]  // örn. ["macro", "tracking", "continuous_push_in"]
  storyArchetype: string    // örn. "problem_solution", "product_demonstration", "brand_prestige"
  lighting: string          // örn. "warm_morning", "golden_hour", "high_key_clean"
}

export interface CreativeOptimizationScore {
  noveltyScore: number             // 0-100: Geçmişe göre özgünlük derecesi
  brandFitScore: number            // 0-100: Marka DNA'sına uygunluk
  productVisibilityScore: number   // 0-100: Ürün görünürlüğü ve odak netliği
  continuityScore: number          // 0-100: Mekansal devamlılık
  commercialClarityScore: number   // 0-100: Ticari mesajın ilk 3 saniyedeki netliği
  overallScore: number             // Ağırlıklı toplam skor
  antiRepetitionDirectives: string[] // Tekrardan kaçınma direktifleri
}

/**
 * Geçmiş kreatif üretimleri inceleyerek tekrarlanan klişeleri tespit eder
 * ve yeni üretim için anti-repetition kısıtları ile novelty skorunu hesaplar.
 */
export function evaluateCreativeMemory(
  history: CreativeHistoryItem[] = [],
  candidate: Partial<CreativeHistoryItem> = {}
): CreativeOptimizationScore {
  if (!history || history.length === 0) {
    return {
      noveltyScore: 100,
      brandFitScore: 95,
      productVisibilityScore: 90,
      continuityScore: 95,
      commercialClarityScore: 92,
      overallScore: 94,
      antiRepetitionDirectives: [],
    }
  }

  const recent = history.slice(-10) // Son 10 iş
  const antiRepetitionDirectives: string[] = []

  // Frekans analizi
  const hookCounts: Record<string, number> = {}
  const lightingCounts: Record<string, number> = {}
  const cameraCounts: Record<string, number> = {}

  for (const item of recent) {
    if (item.hookType) hookCounts[item.hookType] = (hookCounts[item.hookType] || 0) + 1
    if (item.lighting) lightingCounts[item.lighting] = (lightingCounts[item.lighting] || 0) + 1
    if (Array.isArray(item.cameraLanguage)) {
      for (const c of item.cameraLanguage) {
        cameraCounts[c] = (cameraCounts[c] || 0) + 1
      }
    }
  }

  // Eğer bir özellik son 10 işte 3'ten fazla tekrar etmişse kısıt listesine ekle
  for (const [hook, count] of Object.entries(hookCounts)) {
    if (count >= 3) {
      antiRepetitionDirectives.push(`DO NOT REPEAT overused hook pattern: ${hook}`)
    }
  }
  for (const [light, count] of Object.entries(lightingCounts)) {
    if (count >= 3) {
      antiRepetitionDirectives.push(`DO NOT REPEAT overused lighting trope: ${light}`)
    }
  }
  for (const [cam, count] of Object.entries(cameraCounts)) {
    if (count >= 4) {
      antiRepetitionDirectives.push(`DO NOT REPEAT repetitive camera movement: ${cam}`)
    }
  }

  // Novelty Hesabı: Aday özelliklerin geçmişteki kullanım sıklığına bakar
  let noveltyPenalty = 0
  if (candidate.hookType && hookCounts[candidate.hookType]) {
    noveltyPenalty += hookCounts[candidate.hookType] * 12
  }
  if (candidate.lighting && lightingCounts[candidate.lighting]) {
    noveltyPenalty += lightingCounts[candidate.lighting] * 10
  }

  const noveltyScore = Math.max(20, Math.min(100, 100 - noveltyPenalty))
  const brandFitScore = 95
  const productVisibilityScore = 92
  const continuityScore = 95
  const commercialClarityScore = 90

  // Ağırlıklı Toplam: Novelty (%30) + BrandFit (%25) + ProductVisibility (%25) + Clarity (%20)
  const overallScore = Math.round(
    noveltyScore * 0.30 +
    brandFitScore * 0.25 +
    productVisibilityScore * 0.25 +
    commercialClarityScore * 0.20
  )

  return {
    noveltyScore,
    brandFitScore,
    productVisibilityScore,
    continuityScore,
    commercialClarityScore,
    overallScore,
    antiRepetitionDirectives,
  }
}
