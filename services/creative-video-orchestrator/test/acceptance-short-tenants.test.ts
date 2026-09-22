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

test('Acceptance Short: Bofe Tarım (9:16, agricultural sector, QA PASS)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
    imageProvider: new MockImageGenerationProvider(),
  })

  const bofeInput: RawBrandInput = {
    org_id: 'org_bofe_tarim',
    brand_name: 'Bofe Tarım',
    sector_profile: 'agriculture_farming',
    brand_description: 'Tarımsal ilaçlama ve sırt pompaları üreticisi',
    brand_palette: { primary: '#1B5E20', accent: '#FDD835' },
    typography: { headingFont: 'Montserrat', primaryColor: '#FFFFFF' },
    tone_of_voice: ['reliable', 'agricultural craftsmanship'],
    visual_style: ['lush green apple orchard in crisp morning sunlight'],
    logo_asset_id: 'asset_bofe_logo_official',
    logo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    logo_file_path: 'services/omnistudio/gateway/bofe_logo_clean_white.png',
    products: [
      {
        product_id: 'prod_bofe_pump_16l',
        name: 'Bofe Şarjlı Sırt Pompası 16L',
        description: 'Meyve bahçeleri ve tarımsal alanlar için 16 litre akülü mikronize ilaçlama sırt pompası',
        asset_id: 'asset_bofe_pump_clean',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        file_path: 'scratch/production_deliverables/keyframes/bofe_tarim_10s_frame_00pct.jpg',
      },
    ],
    campaign: {
      objective: 'Direct commercial sales to orchard farmers',
      cta: 'Şimdi Sipariş Verin',
      offer: 'Özel Lansman Fiyatı',
    },
    mandatory_elements: ['Bofe Şarjlı Sırt Pompası 16L'],
    forbidden_elements: ['car', 'automobile', 'pressure washer lance'],
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 8,
    output_type: 'SHORT_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_bofe_short_01', bofeInput)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_bofe_tarim')
  assert.equal(result.strategy.strategyType, 'SHORT_VIDEO')
  assert.equal(result.strategy.sectorPreset.id, 'agriculture_farming')
  assert.equal(result.sceneQAReports.length, 1)
  assert.equal(result.sceneQAReports[0].passed, true)
  assert.ok(result.outputFilePath.includes('_finished.mp4'))
  assert.ok(result.provenance.verified)
})

test('Acceptance Short: Ayvazoğlu İnşaat (9:16, construction sector, QA PASS)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
    imageProvider: new MockImageGenerationProvider(),
  })

  const ayvazInput: RawBrandInput = {
    org_id: 'org_ayvazoglu',
    brand_name: 'Ayvazoğlu İnşaat',
    sector_profile: 'construction_materials',
    brand_description: 'Yüksek mukavemetli pişmiş kil yapı tuğlaları',
    brand_palette: { primary: '#B71C1C', accent: '#FFC107' },
    typography: { headingFont: 'Teko', primaryColor: '#FFFFFF' },
    tone_of_voice: ['robust', 'foundational', 'industrial craftsmanship'],
    visual_style: ['natural morning sunlight on raw terracotta brick masonry'],
    logo_asset_id: 'asset_ayvaz_logo_official',
    logo_sha256: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
    logo_file_path: 'scratch/ayvazoglu_logo_official.png',
    products: [
      {
        product_id: 'prod_ayvaz_brick',
        name: 'Ayvazoğlu Taşıyıcı Tuğla',
        description: 'Standart pişmiş kil dayanıklı inşaat tuğlası',
        asset_id: 'asset_ayvaz_brick_ref',
        sha256: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        file_path: 'scratch/ayvaz_tuğla_db.webp',
      },
    ],
    campaign: {
      objective: 'Commercial builder supply orders',
      cta: 'Toptan Fiyat Teklifi Alın',
    },
    mandatory_elements: ['Ayvazoğlu Taşıyıcı Tuğla'],
    forbidden_elements: ['plastic toy', 'cartoon'],
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 10,
    output_type: 'SHORT_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_ayvaz_short_01', ayvazInput)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_ayvazoglu')
  assert.equal(result.strategy.sectorPreset.id, 'construction_materials')
  assert.equal(result.sceneQAReports[0].passed, true)
})

test('Acceptance Short: Veri Burada (9:16, cloud & B2B software, QA PASS)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
  })

  const veriBuradaInput: RawBrandInput = {
    org_id: 'org_veriburada',
    brand_name: 'Veri Burada',
    sector_profile: 'software_cloud_b2b',
    brand_description: 'Omnichannel müşteri iletişim ve otomasyon platformu',
    brand_palette: { primary: '#0D47A1', accent: '#00E676' },
    typography: { headingFont: 'Inter', primaryColor: '#FFFFFF' },
    tone_of_voice: ['innovative', 'frictionless', 'productive'],
    visual_style: ['clean modern architectural office, live analytics dashboard'],
    logo_asset_id: 'asset_veriburada_logo',
    logo_sha256: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    logo_file_path: 'scratch/veriburada_logo.png',
    products: [
      {
        product_id: 'prod_veriburada_suite',
        name: 'Veri Burada WhatsApp Bot & CRM',
        description: 'Tüm mesajlaşma kanallarını tek merkezden yöneten yapay zeka destekli platform',
        asset_id: 'asset_veriburada_prod',
        sha256: 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3',
        file_path: 'scratch/veriburada_product.png',
      },
    ],
    campaign: {
      objective: 'Enterprise SaaS leads',
      cta: 'Hemen Ücretsiz Deneyin',
      offer: '14 Gün Deneme',
    },
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 8,
    output_type: 'SHORT_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_veriburada_short_01', veriBuradaInput)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_veriburada')
  assert.equal(result.strategy.sectorPreset.id, 'software_cloud_b2b')
  assert.equal(result.sceneQAReports[0].passed, true)
})

test('Acceptance Short: 301st Generic Tenant ("Artisan Roastery" - food & beverage, zero code changes, QA PASS)', async () => {
  const gflow = new MockGFlowProvider()
  const ffmpeg = new MockFFmpegAdapter()
  const orchestrator = new CreativeVideoOrchestrator({
    gflowProvider: gflow,
    ffmpegAdapter: ffmpeg,
    creativeModel: new MockCreativeModelProvider(),
  })

  // Completely unknown tenant arriving dynamically
  const tenant301Input: RawBrandInput = {
    org_id: 'org_roastery_301',
    brand_name: 'Artisan Roast Co.',
    sector_profile: 'food_beverage',
    brand_description: 'Single-origin specialty micro-lot coffee roaster',
    brand_palette: { primary: '#4E342E', accent: '#D7CCC8' },
    logo_asset_id: 'asset_logo_artisan_301',
    logo_sha256: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    products: [
      {
        product_id: 'prod_ethiopia_beans',
        name: 'Yirgacheffe Single Origin Beans',
        description: 'Floral and citrus specialty coffee beans',
        asset_id: 'asset_beans_pack',
        sha256: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
      },
    ],
    campaign: {
      objective: 'Coffee club subscription',
      cta: 'Aboneliğinizi Başlatın',
    },
    language: 'tr',
    aspect_ratio: '9:16',
    requested_duration: 8,
    output_type: 'SHORT_VIDEO',
  }

  const result = await orchestrator.executeCreativeJob('job_tenant_301_short', tenant301Input)

  assert.equal(result.verified, true)
  assert.equal(result.orgId, 'org_roastery_301')
  assert.equal(result.strategy.sectorPreset.id, 'food_beverage')
  assert.equal(result.strategy.sectorPreset.defaultArchetype, 'food_appetite')
  assert.equal(result.sceneQAReports[0].passed, true)
})
