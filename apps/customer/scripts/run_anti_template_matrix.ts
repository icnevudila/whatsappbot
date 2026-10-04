import { createClient } from '@supabase/supabase-js'
import { processCreativeGeneration } from '../src/lib/creative/process'
import { deriveVerifiedCampaignData } from '../src/lib/creative/prompt'
import { generateCampaignWhatsAppMessage } from '../src/lib/ai/campaign-message'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

process.env.OMNISTUDIO_GATEWAY_URL = process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456'
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const TEST_USER_ID = 'e0784e2d-b636-4b31-8c72-dadd021adec3'

const DESKTOP_DIR = 'C:\\Users\\TP2\\Desktop\\mesajify_ciktilar'
const BRAIN_DIR = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270'

if (!fs.existsSync(DESKTOP_DIR)) fs.mkdirSync(DESKTOP_DIR, { recursive: true })

type Spec = {
  index: number
  key: string
  name: string
  orgId: string
  brandName: string
  sector: string
  headline: string
  brief: string
  price?: string
  oldPrice?: string
  offer?: string
  deliveryInfo?: string
  primaryBenefits?: string[]
  cta: string
  productName: string
  productImage: string
  logoPath: string
  brandKit: {
    id: string
    name: string
    tone: string
    colors: Record<string, string>
    fonts: Record<string, string>
    logoPath: string
  }
}

const SPECS: Spec[] = [
  {
    index: 1,
    key: '1_bofe_tarim_commercial',
    name: '1. Bofe Tarım',
    orgId: 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0',
    brandName: 'Bofe Tarım',
    sector: 'Tarım ve Bahçe Ekipmanları',
    headline: 'Bahçenizde Yüksek Verim İçin Profesyonel Çözüm',
    brief: 'Bahçenizde yüksek verim için profesyonel ilaçlama çözümü',
    price: '1.450 TL',
    oldPrice: '1.850 TL',
    offer: 'Lansmana Özel %22 İndirim',
    deliveryInfo: 'Aynı gün kargo · Kapıda ödeme imkanı',
    primaryBenefits: ['8 Bar Yüksek Basınç', 'Pirinç Nozul', 'Akü Şarjlı'],
    cta: 'Hemen Sipariş Ver',
    productName: '16L Akülü Sırt Tipi İlaçlama Pompası',
    productImage: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/products/20cec3de-b581-4e7e-a3fa-4ac5c2835226/e08e3adb-9633-4e14-a799-619762ae28e0.jpg',
    logoPath: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/kits/5bd94b86-156a-450f-99b1-4b4a650179d2/logo.jpg',
    brandKit: {
      id: '5bd94b86-156a-450f-99b1-4b4a650179d2',
      name: 'Bofe Tarım',
      tone: 'Güçlü ve dayanıklı tarım makineleri',
      colors: { primary: '#026009', accent: '#acfe00', background: '#026009', text: '#ffffff' },
      fonts: { heading: 'Outfit' },
      logoPath: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/kits/5bd94b86-156a-450f-99b1-4b4a650179d2/logo.jpg',
    },
  },
  {
    index: 2,
    key: '2_ayvazoglu_insaat_commercial',
    name: '2. Ayvazoğlu İnşaat',
    orgId: '4a58b0dd-0931-4901-880a-686457d15010',
    brandName: 'Ayvazoğlu İnşaat',
    sector: 'İnşaat ve Yapı Malzemeleri',
    headline: 'Tuğlada Sezon İndirimi Devam Ediyor',
    brief: 'Şantiyelerinize toptan klinker tuğla teslimat kampanyası',
    price: '18.50 TL',
    oldPrice: '26.00 TL',
    offer: '%30 Toptan İndirim',
    deliveryInfo: '3 gün içinde doğrudan şantiyeye teslim',
    primaryBenefits: ['Fabrikadan Sevkiyat', 'Yüksek Dayanım', 'Toptan Fiyat'],
    cta: 'Hemen Teklif Alın',
    productName: 'Klinker Tuğla 2',
    productImage: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/4a58b0dd-0931-4901-880a-686457d15010/products/ecd51dd4-3184-4ba2-89b5-a9b046005b0c/af30ce7a-ef95-488f-87e5-10721b7211ba.jpg',
    logoPath: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg',
    brandKit: {
      id: '489f335c-ea99-46e4-b8dd-b75dd68255ea',
      name: 'Ayvazoğlu İnşaat',
      tone: 'Mimari prestij, kurumsal ciddiyet, mühendislik kalitesi',
      colors: { primary: '#a82218', accent: '#d32f2f', secondary: '#263238', text: '#ffffff' },
      fonts: { heading: 'Montserrat' },
      logoPath: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg',
    },
  },
  {
    index: 3,
    key: '3_usta_doner_commercial',
    name: '3. Usta Döner',
    orgId: 'a2e4cc0c-7a82-47f1-a618-0baebf6b67a3',
    brandName: 'Usta Döner',
    sector: 'Restoran & Yiyecek',
    headline: 'Doyurucu Hatay Usulü Lezzet Menüsü',
    brief: 'Odun ateşinde Hatay usulü soslu tavuk dürüm menü kampanyası',
    price: '220 TL',
    oldPrice: '280 TL',
    offer: '2 Dürüm + Ayran Fırsatı',
    deliveryInfo: 'Sıcak teslimat · Paket servis',
    primaryBenefits: ['Özel Soslu', 'Odun Ateşinde', 'Taze Lavaşa'],
    cta: 'Sipariş Ver',
    productName: 'Hatay Usulü Tavuk Dürüm Menü',
    productImage: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=800',
    logoPath: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
    brandKit: {
      id: 'kit-doner',
      name: 'Usta Döner',
      tone: 'Samimi lezzet, hızlı servis, doyurucu menü',
      colors: { primary: '#dc2626', accent: '#f59e0b', background: '#1c1917', text: '#ffffff' },
      fonts: { heading: 'Montserrat' },
      logoPath: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=400',
    },
  },
  {
    index: 4,
    key: '4_lale_cicekcilik_commercial',
    name: '4. Lale Çiçekçilik',
    orgId: '4a58b0dd-0931-4901-880a-686457d15010',
    brandName: 'Lale Çiçekçilik',
    sector: 'Çiçekçilik & Butik Hediye',
    headline: 'Özel Tasarım Taze Gül Buketlerinde Sezon İndirimi',
    brief: 'Özel tasarım taze gül ve okaliptüs buketi lansman indirimi',
    price: '450 TL',
    oldPrice: '550 TL',
    offer: '%18 İndirim · Aynı Gün Ücretsiz Teslimat',
    deliveryInfo: 'Özel ambalajında adrese teslim',
    primaryBenefits: ['Taze Çiçekler', 'El Yapımı Tasarım', 'Kişiye Özel Kart'],
    cta: 'Sipariş Ver',
    productName: 'Gül & Okaliptüs Tasarım Buketi',
    productImage: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=800',
    logoPath: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=400',
    brandKit: {
      id: 'kit-lale',
      name: 'Lale Çiçekçilik',
      tone: 'Zarif, samimi, taze ve özenli butik çiçekçilik',
      colors: { primary: '#be123c', accent: '#f43f5e', background: '#fff1f2', text: '#1f2937' },
      fonts: { heading: 'Montserrat' },
      logoPath: 'https://images.unsplash.com/photo-1508615039623-a25605d2b022?w=400',
    },
  },
  {
    index: 5,
    key: '5_vortex_endustriyel_commercial',
    name: '5. Vortex Endüstriyel (Bilinmeyen Marka)',
    orgId: 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0',
    brandName: 'Vortex Endüstriyel',
    sector: 'Ağır Sanayi Yedek Parça',
    headline: 'Yüksek Devirde Kesintisiz Güç',
    brief: 'Ağır sanayi tipi konik makaralı rulmanlarda toptan fabrika indirimi',
    price: '850 TL',
    oldPrice: '1.050 TL',
    offer: 'Toptan Alımda %20 İndirim',
    deliveryInfo: 'Fabrikadan doğrudan sevkiyat',
    primaryBenefits: ['Dövme Çelik Gövde', 'Yüksek Isı Dayanımı', 'Sertifikalı Kalite'],
    cta: 'Hemen Teklif İste',
    productName: 'Konik Makaralı Ağır Yük Rulmanı 32210',
    productImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
    logoPath: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    brandKit: {
      id: 'kit-vortex',
      name: 'Vortex Endüstriyel',
      tone: 'Teknik, dayanıklı ve kurumsal sanayi çözümleri',
      colors: { primary: '#0a192f', accent: '#00f0ff', background: '#0a192f', text: '#ffffff' },
      fonts: { heading: 'Inter' },
      logoPath: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400',
    },
  },
]

async function generateSingle(spec: Spec) {
  console.log(`\n==================================================`)
  console.log(`GENERATING ANTI-TEMPLATE: ${spec.name} (${spec.key})`)
  console.log(`==================================================`)

  const creativeId = crypto.randomUUID()
  const payload: any = {
    brief: spec.brief,
    customText: spec.headline,
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    templateFamily: 'CAMPAIGN_POSTER',
    sector: spec.sector,
    deliveryInfo: spec.deliveryInfo,
    primaryBenefits: spec.primaryBenefits,
    cta: spec.cta,
    useLogo: true,
    brandKit: spec.brandKit,
    products: [
      {
        id: crypto.randomUUID(),
        name: spec.productName,
        description: `${spec.brandName} ${spec.productName}`,
        boxContents: null,
        imageUrl: spec.productImage,
        price: spec.price || null,
        oldPrice: spec.oldPrice || null,
        promo: spec.offer || null,
        extra: null,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ id: 'p1', label: 'Sipariş Hattı', phone: '0850 000 00 00' }],
    socials: [{ id: 's1', platform: 'Instagram', label: `@${spec.brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`, url: 'https://instagram.com' }],
    customLogoUrl: spec.logoPath,
  }

  const verified = deriveVerifiedCampaignData(payload as any)
  payload.campaignMessage = generateCampaignWhatsAppMessage(verified)

  const { data: inserted, error: insertErr } = await supabase
    .from('creatives')
    .insert({
      id: creativeId,
      org_id: spec.orgId,
      created_by: TEST_USER_ID,
      brand_kit_id: spec.brandKit.id.startsWith('kit-') ? null : spec.brandKit.id,
      title: `${spec.brandName} — ${spec.headline}`,
      source: 'ai',
      generation_type: 'new',
      template: 'ai_library',
      format: 'square',
      payload,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertErr) throw new Error(`Insert error: ${insertErr.message}`)

  console.log(`Created creative record: ${creativeId}`)
  const tStart = Date.now()
  let genResult = await processCreativeGeneration(creativeId, supabase)
  const deadline = Date.now() + 240000
  while (genResult.pending && Date.now() < deadline) {
    const waitSec = genResult.retryAfterSeconds || 4
    console.log(`Pending, polling in ${waitSec}s...`)
    await new Promise(r => setTimeout(r, waitSec * 1000))
    genResult = await processCreativeGeneration(creativeId, supabase)
  }
  const durationSec = ((Date.now() - tStart) / 1000).toFixed(1)
  console.log(`Generation completed in ${durationSec}s. Result:`, genResult)

  const { data: updated, error: readErr } = await supabase
    .from('creatives')
    .select('*')
    .eq('id', creativeId)
    .single()

  if (readErr || !updated) throw new Error(`Read error: ${readErr?.message}`)

  const resultPayload = updated.payload
  const prompt = resultPayload.generatedPrompt
  const receipt = resultPayload.imageOutputReceipt
  const jobId = resultPayload.imageJob?.id || receipt?.jobId || 'N/A'
  const finalSha256 = receipt?.final_sha256 || receipt?.sha256 || 'N/A'
  let publicUrl = updated.public_url || genResult.publicUrl

  if (!publicUrl && jobId !== 'N/A') {
    const st = await fetch(`http://167.233.201.31:3456/v1/images/status/${jobId}`).then(r => r.json()).catch(() => null)
    if (st?.result_url) publicUrl = st.result_url
  }

  console.log(`JOB_ID: ${jobId}`)
  console.log(`PUBLIC URL: ${publicUrl}`)

  if (publicUrl) {
    const res = await fetch(publicUrl)
    const buf = Buffer.from(await res.arrayBuffer())
    const desktopPath = path.join(DESKTOP_DIR, `${spec.key}.png`)
    const brainPath = path.join(BRAIN_DIR, `${spec.key}.png`)
    fs.writeFileSync(desktopPath, buf)
    fs.writeFileSync(brainPath, buf)
    console.log(`Saved output to ${desktopPath} and ${brainPath} (${buf.length} bytes)`)
  }

  return {
    index: spec.index,
    key: spec.key,
    name: spec.name,
    creativeId,
    jobId,
    orgId: spec.orgId,
    prompt,
    publicUrl,
    outputSha256: finalSha256,
    campaignMessage: resultPayload.campaignMessage,
  }
}

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@filo.dev',
    password: 'TestPass123!',
  })
  if (authErr) throw new Error(`Auth error: ${authErr.message}`)
  console.log('Authenticated as test@filo.dev successfully.')

  const targetIndex = process.argv[2] ? parseInt(process.argv[2], 10) : null
  const targets = targetIndex ? SPECS.filter(s => s.index === targetIndex) : SPECS

  const results: any[] = []

  for (const spec of targets) {
    try {
      const res = await generateSingle(spec)
      results.push(res)
      if (targets.length > 1) {
        console.log(`Waiting 20 seconds cooldown before next generation...`)
        await new Promise(r => setTimeout(r, 20000))
      }
    } catch (e: any) {
      console.error(`Failed ${spec.name}:`, e)
      results.push({ index: spec.index, key: spec.key, name: spec.name, error: e?.message || String(e) })
    }
  }

  const resultsPath = path.join(BRAIN_DIR, 'anti_template_results.json')
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`Results saved to ${resultsPath}`)
}

main().catch(console.error)
