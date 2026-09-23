import test from 'node:test'
import assert from 'node:assert'
import {
  ChatGPTCreativeDirectorV2,
  ChatGPTCreativeCritic,
  VeoPromptCompiler,
  CreativeContextBuilder,
  type MultimodalAttachment,
} from '../src/index.js'

test('Integration Test: Product + Logo -> Director -> 3 Concepts -> Selection -> MasterPlan -> Critic -> Compiled Veo Prompt', async () => {
  const attachments: MultimodalAttachment[] = [
    {
      asset_id: 'bofe_hero_01',
      org_id: 'tenant_bofe_real',
      sha256: 'fd99aabb97b39bb3d0557def0f45725d1e7917203777121e775d99d4c71f8e4c',
      role: 'hero_product',
      canonical_handle: '@HeroProduct',
      file_path: '/shared/outputs/inputs/tenant_bofe_real/bofe_sprayer.png',
      attached_successfully: true,
      visual_attributes: {
        shape: 'ergonomik sırt tipi sarı tank, siyah askı kayışları, pirinç nozül uzatması',
        primary_colors: ['#FFCC00', '#222222'],
        visible_handles: true,
        visible_controls: true,
        packaging: 'şarj edilebilir ticari ilaçlama pompası',
      },
    },
    {
      asset_id: 'bofe_logo_01',
      org_id: 'tenant_bofe_real',
      sha256: '0576350c4d92212bd8c219b4b095cf3bc2060302b978753549ad1d3d95c4d8e8',
      role: 'logo',
      canonical_handle: '@BrandLogo',
      file_path: '/shared/outputs/inputs/tenant_bofe_real/bofe_logo.png',
      attached_successfully: true,
    },
  ]

  // Step 1: Build Canonical CreativeContext
  const context = CreativeContextBuilder.build({
    org_id: 'tenant_bofe_real',
    job_id: 'job_integration_bofe_001',
    campaign_id: 'camp_autumn_harvest',
    brand_profile: {
      brand_name: 'Bofe Tarım',
      sector: 'agriculture_equipment',
      tone_of_voice: ['çiftçi dostu', 'güvenilir', 'sahaya hakim'],
      visual_personality: 'Güneşli Ege zeytinliği, gerçek toprak ve yaprak dokusu, ultra net detay',
      palette: ['#FFCC00', '#1B4D3E'],
      typography_preferences: 'Montserrat SemiBold',
      preferred_copy_style: 'Voice-as-spine akıcı doğal konuşma',
      preferred_visual_energy: 'Tempolu, iş bitirici',
      logo_usage_rules: ['Kanonik logo overlay olarak yerleştirilir, yapay bozulma yasak'],
      visual_dos: ['Ürünün gerçek püskürtme gücünü zeytin ağaçlarında göster'],
      visual_donts: ['Fabrika, kapalı ofis veya şehir caddesi gösterme', 'Yapay yazı ekleme'],
      approved_patterns: ['macro_first', 'human_action_motion'],
      rejected_patterns: ['mini_film_not_ad', 'too_many_slogans'],
      successful_creative_traits: ['high_product_visibility', 'voice_spine_continuity'],
    },
    campaign_context: {
      selected_product_or_service: 'Bofe Şarjlı Sırt Pompası',
      campaign_objective: 'Zeytin hasadı öncesi koruyucu ilaçlama için çiftçilere zamandan tasarruf sağlayan şarjlı pompayı tanıtmak',
      user_style_preference: 'AUTO',
      target_platform: 'reels_tiktok_shorts',
      duration: 8,
      aspect_ratio: '9:16',
      language: 'tr',
      campaign_message: 'Zorlu bahçe işlerinde tek tuşla güçlü ilaçlama',
      verified_offer: 'Şimdi Kampanyalı Tanıtım Fiyatıyla',
      verified_price: '2.499 TL',
      verified_cta: 'Hemen İnceleyin',
      verified_phone: '+90 850 308 1234',
      verified_url: 'www.bofe.com.tr',
      subtitle_mode: 'auto',
    },
    attachments,
    recent_fingerprints: [],
    verified_facts: [
      { claim: '16 litre depo hacmi', source_type: 'catalog', source_id: 'cat_vol_16' },
      { claim: 'Şarjlı lityum batarya', source_type: 'catalog', source_id: 'cat_bat_li' },
    ],
  })

  assert.strictEqual(context.asset_manifest.all_attached, true)

  // Step 2: Director Generates 3 Distinct Creative Concepts
  const director = new ChatGPTCreativeDirectorV2()
  const concepts = await director.generateThreeConcepts(context)

  assert.strictEqual(concepts.length, 3)
  console.log('\n--- [INTEGRATION] 3 GENERATED CONCEPTS ---')
  concepts.forEach((c, idx) => {
    console.log(`Concept ${idx + 1} [${c.concept_id}]: "${c.title}" -> ${c.one_sentence_idea}`)
    console.log(`  Format: ${c.ad_format} (${c.format_variant}), Hook: ${c.hook_type}`)
  })

  // Step 3: Concept Selection (AUTO mode)
  const selection = director.selectWinningConcept(concepts, context)
  console.log('\n--- [INTEGRATION] CONCEPT SELECTION ---')
  console.log(`Selected: ${selection.selected_concept_id}`)
  console.log(`Reason: ${selection.selection_reason}`)
  assert.ok(selection.selected_concept)

  // Step 4: Detailed Master Plan Generation (Dynamic 0-8s beats, voice-as-spine)
  const masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, context)
  console.log('\n--- [INTEGRATION] DETAILED MASTER PLAN ---')
  console.log(`Creative Idea: ${masterPlan.creative_idea}`)
  console.log(`Master VO Script: "${masterPlan.master_spoken_script}"`)
  console.log(`Beats Count: ${masterPlan.beats.length}`)
  masterPlan.beats.forEach((b, idx) => {
    console.log(`  Beat ${idx + 1} [${b.start.toFixed(1)}s - ${b.end.toFixed(1)}s] (${b.purpose}): ${b.visual_action.slice(0, 80)}...`)
  })

  assert.strictEqual(masterPlan.beats.length >= 3, true)
  assert.strictEqual(masterPlan.beats[masterPlan.beats.length - 1].end, 8.0)

  // Step 5: Creative Critic Evaluation (Pre-Generation Pass)
  const critic = new ChatGPTCreativeCritic()
  const criticReport = await critic.evaluatePlan(masterPlan, context, 0)

  console.log('\n--- [INTEGRATION] CREATIVE CRITIC REPORT ---')
  console.log(`Critic Decision: ${criticReport.decision}`)
  console.log(`Is Real Ad: ${criticReport.is_real_ad}`)
  console.log(`Hook Strength: ${criticReport.hook_strength}/10, Product Visibility: ${criticReport.product_visibility}/10`)
  console.log(`Failure Codes: [${criticReport.failure_codes.join(', ')}]`)

  assert.strictEqual(criticReport.decision, 'PASS', 'Approved master plan should pass critic cleanly')

  // Step 6: Veo Prompt Compiler (Deterministic final prompt)
  const compiler = new VeoPromptCompiler()
  const compiledPrompt = compiler.compileVeoPrompt(masterPlan)

  console.log('\n--- [INTEGRATION] FINAL COMPILED VEO PROMPT ---')
  console.log(compiledPrompt.cinematicPrompt)
  console.log('\n--- [INTEGRATION] NEGATIVE PROMPT ---')
  console.log(compiledPrompt.negativePrompt)

  assert.ok(compiledPrompt.cinematicPrompt.includes('@HeroProduct'))
  assert.ok(compiledPrompt.cinematicPrompt.includes(masterPlan.master_spoken_script!))
  assert.ok(compiledPrompt.negativePrompt.includes('NO generated on-screen text') || compiledPrompt.negativePrompt.includes('no generated subtitles'))
})
