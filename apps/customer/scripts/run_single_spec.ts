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

const SPECS: Record<number, any> = {
  3: {
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
  4: {
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
}

async function run(index: number) {
  const spec = SPECS[index]
  if (!spec) throw new Error(`Unknown spec index: ${index}`)

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@filo.dev',
    password: 'TestPass123!',
  })
  if (authErr) throw new Error(`Auth failed: ${authErr.message}`)

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
        imageUrl: spec.productImage,
        price: spec.price || null,
        oldPrice: spec.oldPrice || null,
        promo: spec.offer || null,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ id: 'p1', label: 'Sipariş Hattı', phone: '0850 000 00 00' }],
    socials: [{ id: 's1', platform: 'Instagram', label: `@${spec.brandName.toLowerCase().replace(/[^a-z0-9]/g, '')}`, url: 'https://instagram.com' }],
    customLogoUrl: spec.logoPath,
  }

  const verified = deriveVerifiedCampaignData(payload as any)
  payload.campaignMessage = generateCampaignWhatsAppMessage(verified)

  const { error: insertErr } = await supabase.from('creatives').insert({
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
  if (insertErr) throw new Error(`Insert error: ${insertErr.message}`)

  console.log(`Created creative ${creativeId} for ${spec.name}. Starting processCreativeGeneration...`)
  let genResult = await processCreativeGeneration(creativeId, supabase)
  const deadline = Date.now() + 240000
  while (genResult.pending && Date.now() < deadline) {
    const waitSec = genResult.retryAfterSeconds || 4
    console.log(`Pending, waiting ${waitSec}s...`)
    await new Promise(r => setTimeout(r, waitSec * 1000))
    genResult = await processCreativeGeneration(creativeId, supabase)
  }

  console.log('Finished with result:', genResult)

  const { data: updated } = await supabase.from('creatives').select('*').eq('id', creativeId).single()
  const resultPayload = updated?.payload || {}
  const receipt = resultPayload.imageOutputReceipt
  const jobId = resultPayload.imageJob?.id || receipt?.jobId || 'N/A'
  let publicUrl = updated?.public_url || genResult.publicUrl

  if (!publicUrl && jobId !== 'N/A') {
    const st = await fetch(`http://167.233.201.31:3456/v1/images/status/${jobId}`).then(r => r.json()).catch(() => null)
    if (st?.result_url) publicUrl = st.result_url
  }

  console.log('JOB_ID:', jobId)
  console.log('PUBLIC_URL:', publicUrl)

  if (publicUrl) {
    const res = await fetch(publicUrl)
    const buf = Buffer.from(await res.arrayBuffer())
    const desktopPath = path.join(DESKTOP_DIR, `${spec.key}.png`)
    const brainPath = path.join(BRAIN_DIR, `${spec.key}.png`)
    fs.writeFileSync(desktopPath, buf)
    fs.writeFileSync(brainPath, buf)
    console.log(`Saved output to ${desktopPath} and ${brainPath} (${buf.length} bytes)`)
  }
}

const target = parseInt(process.argv[2] || '3', 10)
run(target).catch(console.error)
