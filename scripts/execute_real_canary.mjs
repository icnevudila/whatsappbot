import { randomUUID } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { db as supabase } from './dist/db.js'
const gflowEngineUrl = process.env.GFLOW_ENGINE_URL || 'http://gflow-engine:3461'
import { runSimpleV5HybridExecution } from './dist/simple-v5-execution.js'
import { JobState } from './dist/state-machine.js'

async function main() {
  console.log('======================================================================')
  console.log('🚀 EXECUTING EXACTLY ONE REAL CANARY: SIMPLE_V5_HYBRID (requestedProvider=AUTO)')
  console.log('======================================================================\n')

  const orgId = '4a58b0dd-0931-4901-880a-686457d15010'
  const brandName = 'Ayvazoğlu İnşaat'
  const jobId = randomUUID()
  const attemptId = randomUUID()
  const startTime = Date.now()

  const logoPath = '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_logo_official_transparent.png'
  const productPath = '/shared/outputs/inputs/4a58b0dd-0931-4901-880a-686457d15010/ayvazoglu_canonical_brick.jpg'

  const logoSha = '29f704f4710e4776deb91bf24a51f0f734ce8379e649b68bc28a779d9ef50cc1'
  const productSha = 'ef1e48809c7f706db6f03459b2378e3cb23346a3378dd97ae92712556720f5c2'

  if (!existsSync(logoPath)) throw new Error(`Missing logo file: ${logoPath}`)
  if (!existsSync(productPath)) throw new Error(`Missing product file: ${productPath}`)

  const approvedSpokenLine = 'Ayvazoğlu İnşaat, Ayvazoğlu Tuğla ürününü bu kısa tanıtımda gerçek çalışma ortamında gösteriyor.'

  const rawBrandInput = {
    org_id: orgId,
    brand_name: brandName,
    sector_profile: 'construction_materials',
    brand_description: 'Yüksek dayanımlı standart inşaat tuğlası ve modern yapı elemanları üreticisi',
    brand_palette: { primary: '#D32F2F', secondary: '#FF9800' },
    typography: { headingFont: 'Roboto Bold', primaryColor: '#FFFFFF' },
    tone_of_voice: ['sağlam', 'güvenilir', 'endüstriyel ustalık'],
    visual_style: [
      'Modern inşaat sahası ve şantiye alanı',
      'doğal sabah ışığı altında tuğla duvar örme ustalığı',
      'harç ve tuğla temasında gerçekçi fizik ve malzeme dokusu'
    ],
    logo_asset_id: 'logo_ayvaz_official_01',
    logo_sha256: logoSha,
    logo_file_path: logoPath,
    products: [
      {
        product_id: 'prod_ayvaz_brick_01',
        name: 'Ayvazoğlu Tuğla',
        description: 'Yüksek mukavemetli standart yapı tuğlası',
        asset_id: 'prod_ayvaz_brick_01',
        sha256: productSha,
        file_path: productPath,
      },
    ],
    campaign: {
      objective: 'Müteahhit ve şantiye yöneticilerine yönelik yapı tuğlası tanıtımı',
      cta: 'Ayvazoğlu İnşaat ile Güçlü Temeller',
      user_style_preference: 'AUTO',
      subtitles: 'off',
      approved_spoken_line: approvedSpokenLine,
    },
    verified_claims: ['Standart yapı tuğlası'],
    requested_duration: 8,
    aspect_ratio: '9:16',
    output_type: 'SHORT_VIDEO',
  }

  const assets = [
    {
      asset_id: 'logo_ayvaz_official_01',
      org_id: orgId,
      role: 'logo',
      file_path: logoPath,
      sha256: logoSha,
    },
    {
      asset_id: 'prod_ayvaz_brick_01',
      org_id: orgId,
      role: 'product',
      file_path: productPath,
      sha256: productSha,
    },
  ]

  // 1. Insert Initial Job
  console.log(`[Canary] Inserting ai_media_jobs record: ${jobId}`)
  const { data: job, error: jobErr } = await supabase.from('ai_media_jobs').insert({
    id: jobId,
    org_id: orgId,
    title: 'Ayvazoğlu SIMPLE V5 tek gerçek canary',
    prompt: 'Ayvazoğlu İnşaat seçili yapı tuğlası için referansa sadık kısa ürün tanıtımı.',
    model: 'veo-fast',
    aspect_ratio: '9:16',
    duration_seconds: 8,
    state: JobState.PREPARING_ENV,
    priority: 10,
    expected_ingredient_count: 2,
    creative_engine_mode: 'SIMPLE_V5_HYBRID',
    requested_provider: 'AUTO',
    metadata: {
      brand_name: brandName,
      product_name: 'Ayvazoğlu Tuğla',
      creative_engine_mode: 'SIMPLE_V5_HYBRID',
      requested_provider: 'AUTO',
      approved_spoken_line: approvedSpokenLine,
    }
  }).select('*').single()

  if (jobErr) {
    throw new Error(`Failed to insert job: ${jobErr.message}`)
  }

  // 2. Insert Initial Attempt
  console.log(`[Canary] Inserting ai_media_attempts record: ${attemptId}`)
  const { error: attErr } = await supabase.from('ai_media_attempts').insert({
    id: attemptId,
    job_id: jobId,
    org_id: orgId,
    flow_account_id: 'account-03',
    status: 'running',
    requested_provider: 'AUTO',
    started_at: new Date().toISOString(),
  })

  if (attErr) {
    throw new Error(`Failed to insert attempt: ${attErr.message}`)
  }

  console.log(`[Canary] Executing runSimpleV5HybridExecution...`)
  await runSimpleV5HybridExecution({
    supabase,
    gflowEngineUrl,
    job,
    accountId: 'account-03',
    attemptId,
    startTime,
    rawInput: rawBrandInput,
    assets,
  })

  console.log(`\n[Canary] Execution finished successfully! Collecting output data...`)

  // Fetch final records
  const { data: finalJob } = await supabase.from('ai_media_jobs').select('*').eq('id', jobId).single()
  const { data: finalAttempt } = await supabase.from('ai_media_attempts').select('*').eq('id', attemptId).single()
  const { data: finalOutput } = await supabase.from('ai_media_outputs').select('*').eq('job_id', jobId).single()

  console.log('\n================ CANARY FINAL DETAILS ================')
  console.log(JSON.stringify({
    job: finalJob,
    attempt: finalAttempt,
    output: finalOutput,
  }, null, 2))

  process.exit(0)
}

main().catch(err => {
  console.error('[Canary ERROR]:', err)
  process.exit(1)
})
