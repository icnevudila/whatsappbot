import test from 'node:test'
import assert from 'node:assert/strict'
import { CreativeContextBuilder, type CreativeContext } from '../src/types/creative-context.js'
import { CreativeQualityHarness } from '../src/evaluation/creative-quality-harness.js'

function context(style: string, sector = 'agriculture_equipment'): CreativeContext {
  return CreativeContextBuilder.build({
    org_id: 'fixture_org', job_id: `fixture_${sector}_${style}`, brand_profile: {
      brand_name: 'Fixture Marka', sector, tone_of_voice: ['net'], visual_personality: 'gerçek kullanım', palette: ['#111111'], typography_preferences: 'sans', preferred_copy_style: 'doğal', preferred_visual_energy: 'dinamik', logo_usage_rules: [], visual_dos: ['ürünü göster'], visual_donts: ['ilgisiz ortam gösterme'], approved_patterns: [], rejected_patterns: [], successful_creative_traits: [],
    }, campaign_context: { selected_product_or_service: 'Şarjlı Sırt Pompası', campaign_objective: 'ürünü tanıt', user_style_preference: style, target_platform: 'reels', duration: 8, aspect_ratio: '9:16', language: 'tr', subtitle_mode: 'off' },
    attachments: [{ asset_id: 'fixture_hero', org_id: 'fixture_org', sha256: 'FIXTURE_SHA_NOT_PRODUCTION_PROOF', role: 'hero_product', canonical_handle: '@HeroProduct', file_path: '/fixture/product.png', attached_successfully: true, visual_attributes: { shape: 'sırt tipi pompa', primary_colors: ['#FFCC00'] } }],
    verified_facts: [{ claim: 'Şarjlı lityum batarya', source_type: 'catalog', source_id: 'fixture_catalog' }],
  })
}

test('evaluation harness runs style matrix without provider or Veo calls', async () => {
  const harness = new CreativeQualityHarness()
  const styles = ['AUTO', 'FAST_SALES', 'PRODUCT_USAGE', 'PROBLEM_SOLUTION', 'SOCIAL_UGC', 'PREMIUM', 'OFFER']
  const results = await Promise.all(styles.map(style => harness.evaluate(context(style))))
  assert.equal(results.length, styles.length)
  assert.ok(results.every(result => result.asset_proof === 'FIXTURE' && result.concepts.length === 3 && result.timing.total_duration <= 8))
  const comparisons = harness.compare(results)
  assert.equal(comparisons.length, 21)
  assert.ok(comparisons.every(item => item.clone_risk === 'low' || item.clone_risk === 'medium' || item.clone_risk === 'high'))
})

test('evaluation harness runs planning-only cross-sector matrix with fixture proof', async () => {
  const harness = new CreativeQualityHarness()
  const sectors = ['agriculture_equipment', 'construction_material', 'food_restaurant', 'saas_software', 'b2b_service']
  const results = await Promise.all(sectors.map(sector => harness.evaluate(context('AUTO', sector))))
  assert.deepEqual(results.map(result => result.sector), sectors)
  assert.ok(results.every(result => result.asset_proof === 'FIXTURE' && Array.isArray(result.factual_claims) && Array.isArray(result.contamination.suspicious_tokens)))
})
