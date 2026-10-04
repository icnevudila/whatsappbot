import { createClient } from '@supabase/supabase-js'
import { processCreativeGeneration } from '../src/lib/creative/process'
import { deriveVerifiedCampaignData } from '../src/lib/creative/prompt'
import { generateCampaignWhatsAppMessage } from '../src/lib/ai/campaign-message'
import fs from 'node:fs'
import path from 'node:path'

process.env.OMNISTUDIO_GATEWAY_URL = process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456'
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
const TEST_USER_ID = 'e0784e2d-b636-4b31-8c72-dadd021adec3'

const DESKTOP_DIR = 'C:\\Users\\TP2\\Desktop\\mesajify_ciktilar'
const BRAIN_DIR = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270'

const SPEC = {
  key: 'bofe_variant_A2_refined',
  name: 'Variant A2 — Refined Agency Retail Campaign',
  orgId: 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0',
  brandName: 'Bofe Tarım',
  sector: 'Tarım ve Bahçe Ekipmanları',
  headline: 'Bahçenizde Yüksek Verim İçin Profesyonel Çözüm',
  brief: 'Bahçenizde yüksek verim için profesyonel akülü ilaçlama pompası lansman kampanyası',
  price: '1.450 TL',
  oldPrice: '1.850 TL',
  offer: 'Lansmana Özel %22 İndirim',
  deliveryInfo: 'Aynı gün kargo · Kapıda ödeme imkanı',
  primaryBenefits: ['8 Bar Yüksek Basınç', 'Pirinç Nozul'],
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
  instruction: [
    'ART DIRECTION: REFINED VARIANT A (Professional Agency Campaign Poster).',
    'Keep the exact dynamic composition of Variant A: large dominant 16L sprayer hero in orchard soil, brass lance held by gloved operator spraying fine mist across orchard foliage, realistic sunlight and ground shadows.',
    'REFINE VISUAL STYLING & REMOVE CHEAP PROMO GRAPHICS:',
    '- TYPOGRAPHY: Clean, modern, brand-led Outfit / Inter typography. Crisp letterforms with generous spacing. NO cheap discount-store condensed typography.',
    '- DISCOUNT HOOK: Render "Lansmana Özel %22 İndirim" as a refined editorial campaign treatment—clean white/lime typography on a restrained matte dark-green ribbon or elegant accent strip. NO neon supermarket stickers, NO radioactive glows.',
    '- PRICE HIERARCHY: 1.450 TL is dominant with ultra-bold clean weight and crisp contrast. Small crossed-out 1.850 TL. Clean natural contrast against foliage. AVOID neon glows, 3D text extrusion, and heavy drop shadows.',
    '- COLOR DISCIPLINE: Deep authentic forest green + restrained strategic lime accent (for discount & focal cue only). Do NOT flood the poster with fluorescent neon green.',
    '- CTA TREATMENT: Replace floating web-button with an integrated campaign lower artwork strip: "Hemen Sipariş Ver  |  Aynı Gün Kargo  |  0850 000 00 00". It must feel like part of the print poster artwork, not a clickable web button.',
    '- MINIMAL ICONS: Understated technical cues only ("8 Bar Yüksek Basınç · Pirinç Nozul"). NO generic marketplace clipart.',
  ].join('\n'),
}

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@filo.dev',
    password: 'TestPass123!',
  })
  if (authErr) throw new Error(`Auth error: ${authErr.message}`)
  console.log('Authenticated as test@filo.dev.')

  const creativeId = crypto.randomUUID()
  const payload: any = {
    brief: SPEC.brief,
    customText: SPEC.headline,
    instruction: SPEC.instruction,
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    templateFamily: 'CAMPAIGN_POSTER',
    sector: SPEC.sector,
    deliveryInfo: SPEC.deliveryInfo,
    primaryBenefits: SPEC.primaryBenefits,
    cta: SPEC.cta,
    useLogo: true,
    brandKit: SPEC.brandKit,
    products: [
      {
        id: crypto.randomUUID(),
        name: SPEC.productName,
        description: `${SPEC.brandName} ${SPEC.productName}`,
        imageUrl: SPEC.productImage,
        price: SPEC.price,
        oldPrice: SPEC.oldPrice,
        promo: SPEC.offer,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ id: 'p1', label: 'Sipariş Hattı', phone: '0850 000 00 00' }],
    socials: [{ id: 's1', platform: 'Instagram', label: '@bofetarm', url: 'https://instagram.com' }],
    customLogoUrl: SPEC.logoPath,
  }

  const verified = deriveVerifiedCampaignData(payload as any)
  payload.campaignMessage = generateCampaignWhatsAppMessage(verified)

  const { error: insertErr } = await supabase.from('creatives').insert({
    id: creativeId,
    org_id: SPEC.orgId,
    created_by: TEST_USER_ID,
    brand_kit_id: SPEC.brandKit.id,
    title: `${SPEC.brandName} — ${SPEC.name}`,
    source: 'ai',
    generation_type: 'new',
    template: 'ai_library',
    format: 'square',
    payload,
    status: 'pending',
  })
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
    const desktopPath = path.join(DESKTOP_DIR, `${SPEC.key}.png`)
    const brainPath = path.join(BRAIN_DIR, `${SPEC.key}.png`)
    fs.writeFileSync(desktopPath, buf)
    fs.writeFileSync(brainPath, buf)
    console.log(`Saved output to ${desktopPath} and ${brainPath} (${buf.length} bytes)`)
  }
}

main().catch(console.error)
