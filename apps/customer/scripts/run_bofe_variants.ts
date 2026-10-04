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

const BASE_SPEC = {
  orgId: 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0',
  brandName: 'Bofe Tarım',
  sector: 'Tarım ve Bahçe Ekipmanları',
  price: '1.450 TL',
  oldPrice: '1.850 TL',
  offer: 'Lansmana Özel %22 İndirim',
  deliveryInfo: 'Aynı gün kargo · Kapıda ödeme imkanı',
  primaryBenefits: ['8 Bar Yüksek Basınç', 'Pirinç Nozul', 'Akü Şarjlı'],
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
}

const VARIANTS = [
  {
    key: 'bofe_variant_A_aggressive_retail',
    name: 'Variant A — Aggressive Retail Campaign',
    headline: 'Lansmana Özel %22 İndirim',
    brief: 'Bahçenizde yüksek verim için profesyonel akülü ilaçlama pompası lansman kampanyası',
    cta: 'Hemen Sipariş Ver',
    instruction: 'ART DIRECTION: AGGRESSIVE DIRECT-RESPONSE RETAIL CAMPAIGN. High-energy, bold, asymmetric composition. The 16L sprayer is dynamic and breaking frame in an orchard, with the spray nozzle actively emitting a fine mist across the background. Dominant promotional hook: "Lansmana Özel %22 İndirim" as the undisputed primary sales trigger. Dramatic price hierarchy: small crossed-out 1.850 TL next to a giant, bold, glowing electric-lime 1.450 TL price. Deep environmental integration: real soil, fallen leaves, realistic contact shadows, foreground orchard branch creating natural depth. No rigid catalog UI, no 3-icon rows. CTA is part of the campaign artwork: "Hemen Sipariş Ver • Aynı Gün Kargo".',
  },
  {
    key: 'bofe_variant_B_premium_agri',
    name: 'Variant B — Premium Agricultural Campaign',
    headline: 'Bahçenizde Yüksek Verim İçin Profesyonel Çözüm',
    brief: 'Meyve bahçeleri ve seralar için yüksek dayanımlı profesyonel akülü ilaçlama pompası sezon açılış kampanyası',
    cta: 'Sipariş & Bilgi',
    instruction: 'ART DIRECTION: PREMIUM AGRICULTURAL CAMPAIGN. Authoritative, professional agricultural excellence with deep organic depth. Low-angle hero staging with the 16L sprayer firmly grounded in the soil under an apple tree, morning sun filtering through lush leaves, natural dew and mist. Primary promotional hook: bold seasonal opening badge "Lansmana Özel %22 İndirim". Refined, commanding price hierarchy: small crossed-out 1.850 TL paired with a dominant, high-contrast 1.450 TL. Physical product integration with authentic shadows, texture, and foliage depth. Essential proof callouts: "8 Bar Yüksek Basınç • Pirinç Nozul". Sleek, authoritative campaign contact line: "Sipariş & Bilgi: 0850 000 00 00 • Aynı Gün Kargo".',
  },
  {
    key: 'bofe_variant_C_balanced_high_conversion',
    name: 'Variant C — Balanced High-Conversion Campaign',
    headline: 'Bahçenizde Yüksek Verim — Lansmana Özel %22 İndirim',
    brief: '16L Akülü Sırt Tipi İlaçlama Pompası yüksek verimli doğrudan satış kampanyası',
    cta: 'Hemen Sipariş Ver',
    instruction: 'ART DIRECTION: BALANCED HIGH-CONVERSION CAMPAIGN. Perfect commercial balance between retail urgency and premium agricultural craftsmanship. 65% hero dominance: 16L sprayer angled in orchard with natural sunlight, ground contact shadow, and ambient foliage. Dominant promotional hook: "%22 İNDİRİM" locked directly into the price presentation. Dramatic price contrast: small red strikethrough 1.850 TL leading into a massive ultra-bold 1.450 TL in vibrant lime/yellow. Concise 2-second readability: WHAT (16L Akülü Pompa), WHAT OFFER (Lansmana Özel %22 İndirim), WHAT PRICE (1.450 TL), WHY NOW (Aynı Gün Kargo). Integrated campaign CTA bar.',
  },
]

async function generateVariant(v: typeof VARIANTS[0]) {
  console.log(`\n==================================================`)
  console.log(`GENERATING: ${v.name} (${v.key})`)
  console.log(`==================================================`)

  const creativeId = crypto.randomUUID()
  const payload: any = {
    brief: v.brief,
    customText: v.headline,
    instruction: v.instruction,
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    templateFamily: 'CAMPAIGN_POSTER',
    sector: BASE_SPEC.sector,
    deliveryInfo: BASE_SPEC.deliveryInfo,
    primaryBenefits: BASE_SPEC.primaryBenefits,
    cta: v.cta,
    useLogo: true,
    brandKit: BASE_SPEC.brandKit,
    products: [
      {
        id: crypto.randomUUID(),
        name: BASE_SPEC.productName,
        description: `${BASE_SPEC.brandName} ${BASE_SPEC.productName}`,
        boxContents: null,
        imageUrl: BASE_SPEC.productImage,
        price: BASE_SPEC.price,
        oldPrice: BASE_SPEC.oldPrice,
        promo: BASE_SPEC.offer,
        extra: null,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ id: 'p1', label: 'Sipariş Hattı', phone: '0850 000 00 00' }],
    socials: [{ id: 's1', platform: 'Instagram', label: '@bofetarm', url: 'https://instagram.com' }],
    customLogoUrl: BASE_SPEC.logoPath,
  }

  const verified = deriveVerifiedCampaignData(payload as any)
  payload.campaignMessage = generateCampaignWhatsAppMessage(verified)

  const { error: insertErr } = await supabase
    .from('creatives')
    .insert({
      id: creativeId,
      org_id: BASE_SPEC.orgId,
      created_by: TEST_USER_ID,
      brand_kit_id: BASE_SPEC.brandKit.id,
      title: `${BASE_SPEC.brandName} — ${v.name}`,
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
    const desktopPath = path.join(DESKTOP_DIR, `${v.key}.png`)
    const brainPath = path.join(BRAIN_DIR, `${v.key}.png`)
    fs.writeFileSync(desktopPath, buf)
    fs.writeFileSync(brainPath, buf)
    console.log(`Saved output to ${desktopPath} and ${brainPath} (${buf.length} bytes)`)
  }

  return {
    key: v.key,
    name: v.name,
    creativeId,
    jobId,
    prompt,
    publicUrl,
    outputSha256: finalSha256,
  }
}

async function main() {
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@filo.dev',
    password: 'TestPass123!',
  })
  if (authErr) throw new Error(`Auth error: ${authErr.message}`)
  console.log('Authenticated as test@filo.dev successfully.')

  const targetIdx = process.argv[2] !== undefined ? parseInt(process.argv[2], 10) : null
  const targets = targetIdx !== null ? [VARIANTS[targetIdx]] : VARIANTS

  const results: any[] = []
  for (const v of targets) {
    try {
      const res = await generateVariant(v)
      results.push(res)
      if (targets.length > 1) {
        console.log(`Waiting 15 seconds cooldown before next variant...`)
        await new Promise(r => setTimeout(r, 15000))
      }
    } catch (e: any) {
      console.error(`Failed ${v.name}:`, e)
      results.push({ key: v.key, name: v.name, error: e?.message || String(e) })
    }
  }

  const resultsPath = path.join(BRAIN_DIR, 'bofe_variants_results.json')
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2))
  console.log(`Saved results to ${resultsPath}`)
}

main().catch(console.error)
