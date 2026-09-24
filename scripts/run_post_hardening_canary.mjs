import process from 'node:process'

const mode = process.argv[2] || 'dry-run'
const isEnqueue = mode === 'enqueue-one'
if (mode !== 'dry-run' && !isEnqueue) {
  throw new Error('Mode must be dry-run or enqueue-one')
}
const required = (name) => {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}
const sha256 = (name) => {
  const value = required(name)
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${name} must be a real 64-character SHA-256`)
  return value.toLowerCase()
}
const dryRunValue = (name, placeholder) => isEnqueue ? required(name) : (process.env[name]?.trim() || placeholder)
const dryRunSha256 = (name, placeholder) => {
  if (isEnqueue) return sha256(name)
  const value = process.env[name]?.trim() || placeholder
  if (!/^[a-f0-9]{64}$/i.test(value)) throw new Error(`${name} must be a 64-character SHA-256`)
  return value.toLowerCase()
}

const spokenLine = process.env.CANARY_APPROVED_SPOKEN_LINE?.trim()
  || 'Ayvazoğlu İnşaat yapı tuğlasını gerçek çalışma ortamında yakından ve net gösteriyor.'
const wordCount = spokenLine.split(/\s+/).filter(Boolean).length
if (wordCount > 18) throw new Error(`Approved spoken line is ${wordCount} words; SIMPLE hard maximum is 18`)

const payload = {
  title: process.env.CANARY_TITLE || 'Ayvazoğlu SIMPLE V5 tek gerçek canary',
  brief: 'Ayvazoğlu İnşaat seçili yapı tuğlası için referansa sadık, tek mekanlı kısa tanıtım.',
  adFormat: 'PRODUCT_USAGE',
  userStylePreference: 'AUTO',
  environmentPreset: 'construction_site',
  motionStyle: 'stable_tracking',
  subtitles: 'off',
  promotionType: 'product',
  creativeIdea: 'Seçili yapı tuğlasını tek gerçek kullanım anında, tek mekanda ve üç kısa çekimde göster.',
  speechTimeline: [{ start: 1.0, end: 7.2, text: spokenLine }],
  veoPrompt: 'Ayvazoğlu İnşaat seçili yapı tuğlası için referansa sadık kısa ürün tanıtımı.',
  authoritativeFacts: {
    brand_name: 'Ayvazoğlu İnşaat',
    product_name: 'Ayvazoğlu Tuğla',
    cta: process.env.CANARY_CTA || 'Detayları inceleyin',
    approved_spoken_line: spokenLine,
    verified_claims: ['Standart yapı tuğlası'],
    unverified_facts: [],
  },
  logoAsset: {
    url: dryRunValue('CANARY_LOGO_URL', 'https://replace.invalid/ayvazoglu-logo.png'),
    filePath: process.env.CANARY_LOGO_FILE_PATH || undefined,
    name: process.env.CANARY_LOGO_NAME || 'ayvazoglu-logo.png',
    sha256: dryRunSha256('CANARY_LOGO_SHA256', '0'.repeat(64)),
  },
  productAsset: {
    url: dryRunValue('CANARY_PRODUCT_URL', 'https://replace.invalid/ayvazoglu-tugla.jpg'),
    filePath: process.env.CANARY_PRODUCT_FILE_PATH || undefined,
    name: process.env.CANARY_PRODUCT_NAME || 'ayvazoglu-tugla.jpg',
    sha256: dryRunSha256('CANARY_PRODUCT_SHA256', '1'.repeat(64)),
  },
  referenceAssets: [],
  creativeEngineMode: 'SIMPLE_V5_HYBRID',
  requestedProvider: 'AUTO',
}

console.log(JSON.stringify(payload, null, 2))

if (mode === 'dry-run') {
  console.log('\nDRY RUN ONLY: no job was created and no video credit was spent.')
  process.exit(0)
}

if (process.env.CANARY_CONFIRM_ONE_REAL_VIDEO !== 'YES') {
  throw new Error('Refusing paid generation: set CANARY_CONFIRM_ONE_REAL_VIDEO=YES to enqueue exactly one job')
}

const customerBaseUrl = (process.env.CUSTOMER_APP_URL || 'http://127.0.0.1:3003').replace(/\/$/, '')
const sessionCookie = required('CANARY_SESSION_COOKIE')
const response = await fetch(`${customerBaseUrl}/api/ai-media/jobs`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Cookie: sessionCookie,
  },
  body: JSON.stringify(payload),
  signal: AbortSignal.timeout(30_000),
})
const body = await response.json().catch(() => ({}))
if (!response.ok) {
  throw new Error(`Canary enqueue failed with HTTP ${response.status}: ${JSON.stringify(body)}`)
}

console.log('\nONE CANARY JOB ENQUEUED:')
console.log(JSON.stringify(body, null, 2))
