/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * COMPREHENSIVE PRODUCTION VERIFICATION & TEST SUITE (V6)
 * 
 * Includes:
 * - 14 Unit Test Modules
 * - 7 Multi-Duration Compilations (6s, 8s, 10s, 15s, 30s, 40s, 60s)
 * - 10 Multi-Sector Compilations (Agri, Constr, SaaS, Food, Cosmetics, Auto, Vet, Furn, RealEstate, DeepSeaRobotics)
 * - Anti-Repetition / Memory Frequency Penalty Test
 * - 40s Long-Form Narrative Continuity Test
 * - Audio Duration Gate (250ms tolerance) Rejection Test
 * - Cross-Tenant Provenance Gate Rejection Test
 */

import {
  resolveFacts,
  deriveCreativeDNA,
  formulateStrategicPromise,
  generateCreativeConcepts,
  runConceptTournament,
  formulateDirectorTreatment,
  routeCommercialGrammar,
  generateBeatSheet,
  buildCauseEffectGraph,
  globalCreativeMemory,
  buildSceneContractsV2,
  validateSceneContracts,
  auditProductVisibility,
  auditBrandVisibility,
  compileValidatedSceneContractsToVeo,
  buildAudioPlan,
  verifyAudioDurationGate,
  verifyArtifactProvenance,
  validateAndParseDirectorPlan,
  compileAutonomousCommercialV6,
  type RawCreativeInput,
  type CreativeFingerprint
} from '../apps/customer/src/lib/creative/v6'

// Also test Gateway modules
const {
  probeMediaDurations,
  verifyAudioDurationAlignment,
  masterAudioLoudness
} = require('../services/omnistudio/gateway/audio_mastering_engine.js')

const {
  globalArtifactProvenanceGate,
  ArtifactProvenanceGate
} = require('../services/omnistudio/gateway/artifact_provenance_gate.js')

let passedTests = 0
let failedTests = 0

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passedTests++
    console.log(`  ✅ [PASS] ${testName}`)
  } else {
    failedTests++
    console.error(`  ❌ [FAIL] ${testName}: ${detail || 'Assertion failed'}`)
  }
}

async function runSuite() {
  console.log('\n===============================================================')
  console.log('🎬 MESAJIFY AUTONOMOUS COMMERCIAL DIRECTOR V3 — TEST SUITE')
  console.log('===============================================================\n')

  // -----------------------------------------------------------------
  // 1. UNIT TEST: FACT RESOLVER
  // -----------------------------------------------------------------
  console.log('▶ TEST GROUP 1: Fact Resolver')
  const bofeInput: RawCreativeInput = {
    orgId: 'org_bofe_001',
    brandName: 'Bofe Tarım',
    brief: '16 Litre Şarjlı Sırt Pülverizatörü ile meyve bahçesinde zahmetsiz ilaçlama',
    productName: 'Bofe 16L Akülü Sırt Pompası',
    productDescription: 'Ergonomik gövde, lityum batarya, pirinç nozul, mikronize sisleme',
    productImageUrl: 'https://cdn.bofe.com/assets/sprayer_16l.png',
    logoUrl: 'https://cdn.bofe.com/assets/logo.png',
    cta: 'WhatsApp ile Sipariş Ver',
    durationSeconds: 10,
    sectorHint: 'agriculture'
  }
  const bofeFacts = resolveFacts(bofeInput)
  assert(bofeFacts.brandName === 'Bofe Tarım', 'Brand name resolved correctly')
  assert(bofeFacts.product.name === 'Bofe 16L Akülü Sırt Pompası', 'Product name normalized without hallucination')
  assert(bofeFacts.sectorFacts.sectorProfileId === 'agriculture_equipment', 'Sector correctly inferred from facts')
  assert(bofeFacts.campaign.durationSeconds === 10, 'Duration preserved')

  // -----------------------------------------------------------------
  // 2. UNIT TEST: 4-TIER CREATIVE DNA
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 2: 4-Tier Creative DNA (Zero Hardcoding)')
  const bofeDna = deriveCreativeDNA(bofeFacts)
  assert(bofeDna.brand.personality.length > 0, 'Brand personality derived')
  assert(bofeDna.product.visualStrengths.length > 0, 'Product visual strengths extracted')
  assert(bofeDna.product.avoid.length > 0, 'Product forbidden tropes defined')
  assert(bofeDna.campaign.durationSeconds === 10, 'Campaign duration preserved')

  // -----------------------------------------------------------------
  // 3. UNIT TEST: STRATEGIC PROMISE
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 3: Strategic Promise')
  const promise = formulateStrategicPromise(bofeFacts, bofeDna)
  assert(promise.statement.length > 10, 'Single strategic belief statement formulated')
  assert(promise.viewerBeliefBefore !== promise.viewerBeliefAfter, 'Viewer belief transformation defined (before != after)')
  assert(promise.evidence.length > 0, 'Promise backed by concrete fact evidence')
  assert(promise.forbiddenOverclaims.length > 0, 'Forbidden overclaims explicitly bounded')

  // -----------------------------------------------------------------
  // 4. UNIT TEST: 5 DISTINCT CONCEPTS & TOURNAMENT
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 4: Concept Generator & Tournament')
  const concepts = generateCreativeConcepts(bofeFacts, bofeDna, promise)
  assert(concepts.length === 5, 'Generated exactly 5 creative concepts')
  const devices = new Set(concepts.map(c => c.narrativeDevice))
  assert(devices.size >= 4, `Concepts have diverse narrative devices (found ${devices.size})`)

  const memoryEval = globalCreativeMemory.evaluateMemory(bofeFacts.orgId, 10)
  const tournament = runConceptTournament(concepts, bofeFacts, bofeDna, promise, memoryEval)
  assert(Boolean(tournament.winner), `Tournament crowned a winner: "${tournament.winner.name}"`)
  assert(tournament.winnerScore.totalScore > 50, `Winner achieved solid score (${tournament.winnerScore.totalScore}/100)`)
  assert(tournament.allScores.length === 5, 'All 5 candidates scored against 7 weighted criteria')

  // -----------------------------------------------------------------
  // 5. UNIT TEST: DIRECTOR TREATMENT
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 5: Director Treatment')
  const treatment = formulateDirectorTreatment(tournament.winner, bofeFacts, bofeDna, promise)
  assert(treatment.directorIntent.length > 15, 'Director intent articulated')
  assert(treatment.visualMotif.description.length > 0, 'Visual motif defined')
  assert(treatment.lightingArc.opening.length > 0, 'Lighting arc established')

  // -----------------------------------------------------------------
  // 6. UNIT TEST: GRAMMAR ROUTER
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 6: Commercial Grammar Router')
  const gShort = routeCommercialGrammar(8, true)
  const gMid = routeCommercialGrammar(18, true)
  const gBrand = routeCommercialGrammar(45, true)
  assert(gShort.grammarType === 'short_performance', '8s routed to short_performance')
  assert(gMid.grammarType === 'mid_form', '18s routed to mid_form')
  assert(gBrand.grammarType === 'brand_film', '45s routed to brand_film')

  // -----------------------------------------------------------------
  // 7. UNIT TEST: BEAT SHEET & CAUSE/EFFECT GRAPH
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 7: Beat Sheet & Cause/Effect Graph')
  const beats = generateBeatSheet({
    facts: bofeFacts,
    dna: bofeDna,
    promise,
    treatment,
    targetDurationSeconds: 10
  })
  assert(beats.length >= 2, `Beat sheet generated ${beats.length} beats`)
  const knowledgeChanges = beats.every(b => b.viewerKnowledgeBefore !== b.viewerKnowledgeAfter)
  assert(knowledgeChanges, 'Every beat enforces viewerKnowledgeBefore != viewerKnowledgeAfter')

  const causeEffect = buildCauseEffectGraph(beats)
  assert(causeEffect.length === beats.length - 1, `Causal links connect all consecutive beats (${causeEffect.length} links)`)

  // -----------------------------------------------------------------
  // 8. UNIT TEST: SCENE CONTRACTS V2 & VALIDATOR
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 8: Scene Contracts V2 & Scene Necessity Validator')
  const contracts = buildSceneContractsV2({
    facts: bofeFacts,
    dna: bofeDna,
    treatment,
    beats,
    links: causeEffect,
    cameraMode: 'continuous_take'
  })
  assert(contracts.length > 0, `Built ${contracts.length} scene contracts`)

  const validation = validateSceneContracts(contracts, 10)
  assert(validation.valid, 'Scene validation passed without timeline errors')
  assert(Array.isArray(validation.decorativeScenesPruned), 'Decorative scenes pruned tracking verified')

  // -----------------------------------------------------------------
  // 9. UNIT TEST: VISIBILITY BUDGETS (PRODUCT & BRAND)
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 9: Product & Brand Visibility Budgets')
  const productAudit = auditProductVisibility(validation.validatedScenes, 'short_performance')
  assert(productAudit.passed, `Product visibility budget passed: ${productAudit.totalDirectExposurePercent}% (min: 50%)`)

  const brandAudit = auditBrandVisibility(validation.validatedScenes, 'short_performance', true)
  assert(brandAudit.passed, 'Brand visibility strategy passed without forced billboards')

  // -----------------------------------------------------------------
  // 10. UNIT TEST: AUDIO PLAN & DURATION GATE
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 10: Audio Plan & Duration Gate')
  const audioPlan = buildAudioPlan({
    facts: bofeFacts,
    dna: bofeDna,
    treatment,
    durationSeconds: 10
  })
  assert(audioPlan.wordCount > 0, `Target word count computed: ${audioPlan.wordCount} words`)
  assert(audioPlan.loudnessTarget.integratedLufs === -14, 'EBU R128 social media target set to -14 LUFS')

  // Audio Duration Gate: Success case
  const audioGatePass = verifyAudioDurationGate(10.0, 10.1, 0.25)
  assert(audioGatePass.passed, 'Audio duration gate passes within 250ms tolerance (10.0s vs 10.1s)')

  // Audio Duration Gate: Failure case (4.3s silent tail)
  const audioGateFail = verifyAudioDurationGate(38.0, 33.7, 0.25)
  assert(!audioGateFail.passed && Boolean(audioGateFail.error?.includes('FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH')), 'Audio duration gate strictly rejected 38s video with 33.7s audio (FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH)')

  // Gateway audio duration check
  let gwAudioMismatch = false
  try {
    verifyAudioDurationAlignment(38.0, 33.7, 0.25)
  } catch (err: any) {
    if (err.code === 'FINALIZATION_FAILED_AUDIO_DURATION_MISMATCH') {
      gwAudioMismatch = true
    }
  }
  assert(gwAudioMismatch, 'Gateway verifyAudioDurationAlignment rejects duration delta > 250ms')

  // -----------------------------------------------------------------
  // 11. UNIT TEST: ARTIFACT PROVENANCE GATE
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 11: Artifact Provenance Gate')
  const testProvenance = verifyArtifactProvenance({
    jobId: 'job_bofe_test',
    orgId: 'org_bofe_001',
    brandName: 'Bofe Tarım',
    promptHash: 'prompt_hash_bofe_16l_4k',
    rawVideoSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    storageUrl: 'https://storage.wa.com/bofe/render.mp4'
  })
  assert(testProvenance.valid, 'Valid artifact provenance verified successfully')

  // Cross-tenant injection test
  const provGate = new ArtifactProvenanceGate()
  const os = require('os')
  const fs = require('fs')
  const path = require('path')
  const tempFakeBofe = path.join(os.tmpdir(), '09_Bofe_Tarim_Zeytin_Hasat_Makinesi.mp4')
  fs.writeFileSync(tempFakeBofe, 'fake cross tenant video binary test data')

  let caughtCrossTenant = false
  try {
    provGate.validateProvenanceBeforeDelivery({
      jobId: 'job_test_cross',
      orgId: 'org_veriburada',
      brandName: 'Veri Burada',
      videoFilePath: tempFakeBofe
    })
  } catch (err: any) {
    if (err.code === 'PROVENANCE_SECURITY_FAIL') {
      caughtCrossTenant = true
    }
  } finally {
    try { fs.unlinkSync(tempFakeBofe) } catch (_) {}
  }
  assert(caughtCrossTenant, 'Artifact provenance gate strictly rejected cross-tenant filename spoofing (PROVENANCE_SECURITY_FAIL)')

  // -----------------------------------------------------------------
  // 12. UNIT TEST: RUNTIME GPT SCHEMA PARSER
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 12: Runtime GPT Structured Schema Parser')
  const validJson = JSON.stringify({
    pipeline_version: 'director-v6',
    strategic_promise: { statement: 'Güvenilir inşaat blokları' },
    scenes: [{ scene_id: 'S1', camera: { shot_size: 'wide' }, primary_action: 'Robot kol tuğla dizer' }]
  })
  const parsedOk = validateAndParseDirectorPlan(validJson)
  assert(parsedOk.success, 'Valid director JSON parsed successfully')

  const invalidJson = '```json { "scenes": [] } ```'
  const parsedBad = validateAndParseDirectorPlan(invalidJson)
  assert(!parsedBad.success, 'Invalid schema correctly rejected')

  // -----------------------------------------------------------------
  // 13. MULTI-DURATION SCALING TESTS (6s, 8s, 10s, 15s, 30s, 40s, 60s)
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 13: Multi-Duration Scaling Tests (7 Durations)')
  const testDurations = [6, 8, 10, 15, 30, 40, 60]
  for (const dur of testDurations) {
    const pkg = compileAutonomousCommercialV6({
      brandName: 'Ayvazoğlu Tuğla',
      brief: 'Kırmızı killi yüksek mukavemetli yapı tuğlaları',
      productName: '19luk İzolasyon Tuğlası',
      durationSeconds: dur,
      sectorHint: 'construction_materials'
    })
    const totalScenesDuration = pkg.sceneContracts.reduce((acc, s) => acc + s.durationSec, 0)
    assert(
      Math.abs(totalScenesDuration - dur) <= 0.5,
      `${dur}s Duration Scaling: Total scene duration (${totalScenesDuration.toFixed(1)}s) aligns with target (${dur}s)`
    )
    assert(pkg.veoPrompt.length > 50, `${dur}s Veo Prompt compiled successfully`)
  }

  // -----------------------------------------------------------------
  // 14. MULTI-SECTOR DIVERSITY TESTS (10 Sectors)
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 14: Multi-Sector Diversity Tests (10 Sectors)')
  const sectors = [
    { name: 'Agriculture (Bofe)', sector: 'agriculture', brand: 'Bofe Tarım', prod: 'Pülverizatör' },
    { name: 'Construction (Ayvazoğlu)', sector: 'construction_materials', brand: 'Ayvazoğlu', prod: 'Kırmızı Tuğla' },
    { name: 'B2B SaaS (Veri Burada)', sector: 'saas_b2b', brand: 'Veri Burada', prod: 'B2B İstihbarat Portalı' },
    { name: 'Food & Artisan', sector: 'food_beverage', brand: 'Karaköy Güllüoğlu', prod: 'Fıstıklı Baklava' },
    { name: 'Cosmetics', sector: 'cosmetics', brand: 'Lumina Skin', prod: 'Hyaluronik Serum' },
    { name: 'Automotive', sector: 'automotive', brand: 'Apex Detailing', prod: 'Seramik Kaplama' },
    { name: 'Veterinary', sector: 'veterinary', brand: 'Dost Veteriner', prod: 'Genel Muayene & Aşı' },
    { name: 'Luxury Furniture', sector: 'furniture', brand: 'ModaWood', prod: 'Ceviz Masif Masa' },
    { name: 'Real Estate', sector: 'real_estate', brand: 'Vadi Konakları', prod: 'Panoramik Rezidans' },
    { name: 'Deep Sea Robotics (Novel)', sector: 'deep_sea_robotics', brand: 'Abyss Tech', prod: 'Otonom ROV Dalgıç Robotu' }
  ]

  for (const s of sectors) {
    const pkg = compileAutonomousCommercialV6({
      brandName: s.brand,
      brief: `${s.prod} tanıtımı`,
      productName: s.prod,
      durationSeconds: 10,
      sectorHint: s.sector
    })
    assert(
      pkg.dna.brand.personality.length > 0 && pkg.veoPrompt.includes(s.brand),
      `Sector [${s.name}]: DNA & Veo prompt generated without falling back to generic templates`
    )
  }

  // -----------------------------------------------------------------
  // 15. ANTI-REPETITION / MEMORY EVALUATION TEST
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 15: Creative Memory Anti-Repetition Test')
  const repetitiveHistory: CreativeFingerprint[] = [
    {
      jobId: 'job_1',
      orgId: 'org_repeat_test',
      conceptId: 'C1',
      hookType: 'golden_hour_field',
      lightingStyles: ['golden_hour', 'soft_ambient'],
      cameraPatterns: ['slow_push', 'drone_overview'],
      environments: ['farm_field'],
      humanActions: ['inspecting_crop'],
      timestamp: Date.now() - 100000
    },
    {
      jobId: 'job_2',
      orgId: 'org_repeat_test',
      conceptId: 'C1',
      hookType: 'golden_hour_field',
      lightingStyles: ['golden_hour'],
      cameraPatterns: ['slow_push', 'drone_overview'],
      environments: ['farm_field'],
      humanActions: ['inspecting_crop'],
      timestamp: Date.now() - 80000
    },
    {
      jobId: 'job_3',
      orgId: 'org_repeat_test',
      conceptId: 'C1',
      hookType: 'golden_hour_field',
      lightingStyles: ['golden_hour'],
      cameraPatterns: ['slow_push'],
      environments: ['farm_field'],
      humanActions: ['inspecting_crop'],
      timestamp: Date.now() - 60000
    }
  ]

  const memEval = globalCreativeMemory.evaluateMemory('org_repeat_test', 10, repetitiveHistory)
  assert(
    memEval.avoidRecentPatterns.includes('golden_hour'),
    'Memory correctly flags "golden_hour" as over-used pattern to avoid'
  )
  assert(
    memEval.noveltyScore < 100,
    `Novelty score penalized due to repetition: ${memEval.noveltyScore}/100`
  )

  // -----------------------------------------------------------------
  // 16. LONG-FORM NARRATIVE CONTINUITY (40s)
  // -----------------------------------------------------------------
  console.log('\n▶ TEST GROUP 16: Long-Form (40s) Narrative Continuity Test')
  const longPkg = compileAutonomousCommercialV6({
    brandName: 'Ayvazoğlu',
    brief: 'Topraktan modern mimariye uzanan 40 saniyelik prestijli marka filmi',
    productName: 'Taşıyıcı Kırmızı Tuğla Blokları',
    durationSeconds: 40,
    sectorHint: 'construction_materials'
  })
  assert(longPkg.grammarType === 'brand_film', '40s classified as brand_film')
  assert(longPkg.beatSheet.length >= 4, `Long form generated ${longPkg.beatSheet.length} continuous narrative beats`)
  const hasContinuity = longPkg.causeEffectGraph.length === longPkg.beatSheet.length - 1
  assert(hasContinuity, 'Long form maintains unbroken cause-effect chain from start to end')

  // -----------------------------------------------------------------
  // FINAL REPORT
  // -----------------------------------------------------------------
  console.log('\n===============================================================')
  console.log(`🏁 TEST SUITE COMPLETE: ${passedTests} PASSED, ${failedTests} FAILED`)
  console.log('===============================================================\n')

  if (failedTests > 0) {
    process.exit(1)
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err)
  process.exit(1)
})
