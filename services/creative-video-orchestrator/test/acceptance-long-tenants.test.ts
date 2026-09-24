import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CreativeVideoOrchestrator } from '../src/orchestrator.js'
import {
  MockGFlowProvider,
  MockFFmpegAdapter,
  MockCreativeModelProvider,
  MockImageGenerationProvider,
} from '../src/adapters/mock-providers.js'
import type { RawBrandInput } from '../src/types/brand-snapshot.js'

test('Acceptance Long: Ayvazoğlu İnşaat (35-40s commercial, >=4 scenes, zero VO repetition, all QA PASS)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
    imageProvider: new MockImageGenerationProvider(),
  })

  const ayvazLongInput: RawBrandInput = {
    org_id: 'org_ayvazoglu',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    brand_description: 'Sağlam temeller için yüksek mukavemetli tuğla üretimi',
    brand_palette: { primary: '#B71C1C', accent: '#FFC107' },
    typography: { headingFont: 'Teko', primaryColor: '#FFFFFF' },
    tone_of_voice: ['grounded', 'durable', 'authoritative'],
    visual_style: ['architectural raw masonry construction in morning sunlight'],
    logo_asset_id: 'asset_ayvaz_logo',
    logo_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    logo_file_path: 'scratch/ayvazoglu_logo_official.png',
    products: [
      {
        product_id: 'prod_brick_ayvaz',
        name: 'Ayvazoğlu Taşıyıcı Tuğla',
        description: 'TSE belgeli preslenmiş pişmiş kil taşıyıcı tuğla',
        asset_id: 'asset_ayvaz_brick',
        sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        file_path: 'scratch/ayvaz_tuğla_db.webp',
      },
    ],
    campaign: {
      objective: 'Construction contractor bulk supply agreements',
      cta: 'Hemen Toptan Fiyat Teklifi İsteyin',
      offer: 'Şantiyeye Doğrudan Sevkiyat',
    },
    mandatory_elements: ['Ayvazoğlu Taşıyıcı Tuğla'],
    forbidden_elements: ['plastic toy bricks', 'cartoon construction'],
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 40,
    output_type: 'LONG_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_ayvaz_long_master', ayvazLongInput)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_ayvazoglu')
  assert.equal(result.strategy.strategyType, 'LONG_VIDEO')
  assert.ok(result.strategy.estimatedSceneCount >= 4, `Expected at least 4 scenes, got ${result.strategy.estimatedSceneCount}`)
  assert.equal(result.sceneQAReports.length, result.strategy.estimatedSceneCount)

  // Verify all scene QAs passed
  for (const sceneQA of result.sceneQAReports) {
    assert.equal(sceneQA.passed, true, `Scene ${sceneQA.sceneId} failed QA: ${sceneQA.errors.join('; ')}`)
  }

  // Verify final Long Video QA passed
  assert.ok(result.finalQAReport, 'Final Long Video QA report missing')
  assert.equal(result.finalQAReport.passed, true)
  assert.equal(result.finalQAReport.durationAccuracyOk, true)
  assert.equal(result.finalQAReport.audioVoSyncOk, true)
  assert.equal(result.finalQAReport.brandingOk, true)

  // Verify each scene had a unique flow_project_id
  const executedProjects = gflow.executedJobs.map(j => j.flow_project_id)
  const uniqueProjects = new Set(executedProjects)
  assert.equal(uniqueProjects.size, executedProjects.length, 'Every scene generation must have a unique Flow project ID')
})

test('Acceptance Long: Bofe Tarım (40s commercial, agriculture preset, identical generic pipeline)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
    imageProvider: new MockImageGenerationProvider(),
  })

  const bofeLongInput: RawBrandInput = {
    org_id: 'org_bofe_tarim',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_farming',
    brand_description: 'Meyve bahçeleri için profesyonel ilaçlama ekipmanları',
    brand_palette: { primary: '#1B5E20', accent: '#FDD835' },
    logo_asset_id: 'asset_bofe_logo_official',
    logo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    logo_file_path: 'services/omnistudio/gateway/bofe_logo_clean_white.png',
    products: [
      {
        product_id: 'prod_bofe_pump_16l',
        name: 'Bofe Şarjlı Sırt Pompası 16L',
        description: '16 litre akülü mikronize ilaçlama sırt pompası',
        asset_id: 'asset_bofe_pump_clean',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      },
    ],
    campaign: {
      objective: 'Commercial tractor & orchard supply sales',
      cta: 'Bayinizi Arayın veya Sipariş Verin',
    },
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 40,
    output_type: 'LONG_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_bofe_long_master', bofeLongInput)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_bofe_tarim')
  assert.equal(result.strategy.strategyType, 'LONG_VIDEO')
  assert.equal(result.strategy.sectorPreset.id, 'agriculture_farming')
  assert.ok(result.finalQAReport?.passed)
})

test('Acceptance Long: 301st Tenant ("Artisan Roastery", zero code changes, all QA PASS)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
    imageProvider: new MockImageGenerationProvider(),
  })

  const tenant301LongInput: RawBrandInput = {
    org_id: 'org_roastery_301',
    brand_name: 'Artisan Roast Co.',
    sector_profile: 'food_beverage',
    brand_description: 'Artisanal micro-batch specialty coffee roasting',
    brand_palette: { primary: '#4E342E', accent: '#D7CCC8' },
    logo_asset_id: 'asset_logo_artisan_301',
    logo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    products: [
      {
        product_id: 'prod_coffee_blend',
        name: 'Reserve Espresso Roast Blend',
        description: 'Single-origin roasted espresso beans',
        asset_id: 'asset_blend_pack',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      },
    ],
    campaign: {
      objective: 'Specialty cafe subscriptions',
      cta: 'Aylık Kahve Paketini Seç',
    },
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 35,
    output_type: 'LONG_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_tenant_301_long', tenant301LongInput)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_roastery_301')
  assert.equal(result.strategy.sectorPreset.id, 'food_beverage')
  assert.ok(result.finalQAReport?.passed)
  assert.equal(result.finalQAReport?.durationAccuracyOk, true)
  assert.equal(result.finalQAReport?.audioVoSyncOk, true)
})
