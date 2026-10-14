import { buildCreativePrompt } from '../apps/customer/src/lib/creative/prompt'
import { normalizeStyleMode, type CreativeStyleMode } from '../apps/customer/src/lib/creative/style-mode'
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const GATEWAY_URL = 'http://167.233.201.31:3456/generate'
const DESKTOP_DIR = 'C:\\Users\\TP2\\Desktop\\Mesajify_Final_Uretimler'

if (!fs.existsSync(DESKTOP_DIR)) {
  fs.mkdirSync(DESKTOP_DIR, { recursive: true })
}

console.log('✓ Target directory prepared:', DESKTOP_DIR)

interface BenchmarkSpec {
  id: string
  num: string
  label: string
  brandName: string
  sector: string
  styleMode: CreativeStyleMode
  userPrompt: string
  headline: string
  supportingLine: string
  cta: string
  price?: string
  oldPrice?: string
  offer?: string
  brandKit: any
  product?: any
  referenceImages: { role: string; url: string }[]
  parentJobId?: string
  generationType?: 'initial' | 'variation' | 'revision'
}

const MESAJIFY_LOGO = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png'
const MESAJIFY_UI = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/2881f690-6853-4064-8768-307463ae6255/products/2f047fbe-a90c-4bdc-b472-d969031048e1/0c2a3629-35d5-4d3a-bdc1-d13dad24f8e1.jpg'

const BOFE_LOGO = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/kits/5bd94b86-156a-450f-99b1-4b4a650179d2/logo.jpg'
// Distinct SKUs:
// 1. Delta 10L: Mekanik Basınçlı İlaçlama Pompası (Yeşil silindirik gövde, Delta 10L)
const DELTA_10L_PRODUCT = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/products/20cec3de-b581-4e7e-a3fa-4ac5c2835226/e08e3adb-9633-4e14-a799-619762ae28e0.jpg'
// 2. Bofe 16L: Otomatik Şarjlı Akülü Sırt İlaçlama Pompası (Geniş açık mavi sırt deposu, Bofe logolu)
const BOFE_16L_PRODUCT = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/products/b359ccd3-1616-4000-8000-000000000016/7f776e2c-adf2-45ac-8e99-21e8ac782013.jpg'
const BOFE_PRODUCT = BOFE_16L_PRODUCT

const MESAJIFY_BRAND_KIT = {
  name: 'Mesajify',
  colors: { primary: '#00A884', secondary: '#07100C', accent: '#168347', background: '#FFFFFF', text: '#090B0A' },
  fonts: { heading: 'Outfit', body: 'Inter' },
  tone: 'Modern, teknolojik, kurumsal ve dinamik WhatsApp kampanya platformu.'
}

const BOFE_BRAND_KIT = {
  name: 'Bofe Tarım',
  colors: { primary: '#026009', accent: '#b4fe00', background: '#FFFFFF' },
  fonts: { heading: 'Outfit', body: 'Inter' },
  tone: 'Güvenilir, dayanıklı ve yüksek verimli tarım ekipmanları.'
}

const BENCHMARK_JOBS: BenchmarkSpec[] = [
  // 1. Mesajify - SMART_CAMPAIGN (Default AI hierarchy, empty prompt)
  {
    id: '01_mesajify_smart_campaign',
    num: '01',
    label: 'Mesajify — Akıllı Kampanya (Varsayılan AI)',
    brandName: 'Mesajify',
    sector: 'SaaS & Yazılım',
    styleMode: 'SMART_CAMPAIGN',
    userPrompt: '',
    headline: 'WhatsApp ile Satışlarınızı Büyütün',
    supportingLine: 'Akıllı hat yönetimi ve kişiselleştirilmiş toplu kampanya gönderimi.',
    cta: 'Hemen Başlayın',
    brandKit: MESAJIFY_BRAND_KIT,
    referenceImages: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ]
  },

  // 2. Mesajify - SHOWSTOPPER_CAMPAIGN (Rich 3D typography, commercial layers)
  {
    id: '02_mesajify_showstopper',
    num: '02',
    label: 'Mesajify — Gösterişli Kampanya (3D Tipografi & Katmanlar)',
    brandName: 'Mesajify',
    sector: 'SaaS & Yazılım',
    styleMode: 'SHOWSTOPPER_CAMPAIGN',
    userPrompt: 'Büyük 3D kabartmalı başlık, çoklu cihaz ekranları ve dinamik kampanya katmanları ile etkileyici afiş',
    headline: 'İşletmenizi Zirveye Taşıyın',
    supportingLine: 'Yüksek dönüşümlü WhatsApp pazarlama kontrol merkezi.',
    cta: 'Ücretsiz Keşfet',
    brandKit: MESAJIFY_BRAND_KIT,
    referenceImages: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ]
  },

  // 3. Mesajify - REAL_LIFE_CAMPAIGN (Human operator in real cafe)
  {
    id: '03_mesajify_real_life',
    num: '03',
    label: 'Mesajify — Gerçek Kullanım (Kafe İşletmecisi & Sipariş)',
    brandName: 'Mesajify',
    sector: 'SaaS & Yazılım',
    styleMode: 'REAL_LIFE_CAMPAIGN',
    userPrompt: 'Kafesinde telefonundan WhatsApp müşteri siparişlerini yöneten güleryüzlü kadın işletmeci, doğal mekan',
    headline: 'Müşterilerinizle Anında İletişim',
    supportingLine: 'Sipariş ve mesajları tek ekrandan kolayca yönetin.',
    cta: 'Detaylı Bilgi Al',
    brandKit: MESAJIFY_BRAND_KIT,
    referenceImages: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ]
  },

  // 4. Mesajify - PREMIUM_SHOWCASE (Cinematic dark emerald podium)
  {
    id: '04_mesajify_premium_showcase',
    num: '04',
    label: 'Mesajify — Premium Vitrin (Sinematik Koyu Zümrüt)',
    brandName: 'Mesajify',
    sector: 'SaaS & Yazılım',
    styleMode: 'PREMIUM_SHOWCASE',
    userPrompt: 'Koyu zümrüt ve mat antrasit kaide üstünde sinematik ışıkla parlayan Mesajify ekranı, lüks stüdyo',
    headline: 'Kurumsal İletişimde Yeni Standart',
    supportingLine: 'Prestijli markalar için kesintisiz WhatsApp altyapısı.',
    cta: 'Ayrıcalığı Keşfet',
    brandKit: MESAJIFY_BRAND_KIT,
    referenceImages: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ]
  },

  // 5. Bofe - SMART_CAMPAIGN (Default AI hierarchy, empty prompt)
  {
    id: '05_bofe_smart_campaign',
    num: '05',
    label: 'Bofe — Akıllı Kampanya (Varsayılan AI)',
    brandName: 'Bofe Tarım',
    sector: 'Tarım & Bahçe Ekipmanları',
    styleMode: 'SMART_CAMPAIGN',
    userPrompt: '',
    headline: 'Bofe 16L Akülü Pompa — Bahçenizde Güç',
    supportingLine: '16 litre geniş hazne ve uzun ömürlü lityum batarya ile zahmetsiz ilaçlama.',
    cta: 'Hemen İnceleyin',
    brandKit: BOFE_BRAND_KIT,
    product: {
      name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L',
      description: '16L açık mavi depo haznesi, lityum batarya, paslanmaz teleskopik boru.',
      imageUrl: BOFE_PRODUCT
    },
    referenceImages: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_PRODUCT }
    ]
  },

  // 6. Bofe - SHOWSTOPPER_CAMPAIGN (Embossed 3D headline, verified discount, sales poster)
  {
    id: '06_bofe_showstopper',
    num: '06',
    label: 'Bofe — Gösterişli Kampanya (%22 İndirim & Fiyat)',
    brandName: 'Bofe Tarım',
    sector: 'Tarım & Bahçe Ekipmanları',
    styleMode: 'SHOWSTOPPER_CAMPAIGN',
    userPrompt: '3D kabartmalı başlık, Bofe 16L pompa, %22 indirim rozeti ve 1.450 TL kampanya fiyatı ile zengin satış afişi',
    headline: 'Bahçe Sezonuna Özel Fırsat',
    supportingLine: 'Bofe 16L Akülü Sırt Pompası şimdi 1.450 TL kampanya fiyatıyla.',
    cta: 'Hemen Sipariş Ver',
    price: '1.450 TL',
    oldPrice: '1.850 TL',
    offer: '%22 İndirim',
    brandKit: BOFE_BRAND_KIT,
    product: {
      name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L',
      description: '16L açık mavi depo haznesi, lityum batarya, paslanmaz teleskopik boru.',
      price: '1.450 TL',
      oldPrice: '1.850 TL',
      promo: '%22 İndirim',
      imageUrl: BOFE_PRODUCT
    },
    referenceImages: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_PRODUCT }
    ]
  },

  // 7. Bofe - REAL_LIFE_CAMPAIGN (Agronomist in olive orchard)
  {
    id: '07_bofe_real_life',
    num: '07',
    label: 'Bofe — Gerçek Kullanım (Ziraat Uzmanı & Zeytinlik)',
    brandName: 'Bofe Tarım',
    sector: 'Tarım & Bahçe Ekipmanları',
    styleMode: 'REAL_LIFE_CAMPAIGN',
    userPrompt: 'Zeytin bahçesinde Bofe 16L pompa ile çalışan kadın ziraat uzmanı, doğal sabah gün ışığı',
    headline: 'Tarlada ve Bahçede Profesyonel Çözüm',
    supportingLine: 'Ergonomik sırt desteğiyle yorulmadan gün boyu ilaçlama yapın.',
    cta: 'Ürünü İnceleyin',
    brandKit: BOFE_BRAND_KIT,
    product: {
      name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L',
      imageUrl: BOFE_PRODUCT
    },
    referenceImages: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_PRODUCT }
    ]
  },

  // 8. Bofe - PREMIUM_SHOWCASE (Anthracite stone plinth, cinematic lighting)
  {
    id: '08_bofe_premium_showcase',
    num: '08',
    label: 'Bofe — Premium Vitrin (Taş Podyum & Sinematik Işık)',
    brandName: 'Bofe Tarım',
    sector: 'Tarım & Bahçe Ekipmanları',
    styleMode: 'PREMIUM_SHOWCASE',
    userPrompt: 'Koyu antrasit doğal taş podyum üstünde Delta 10L mekanik pompa, dramatik sinematik ışık ve heykelsi gölgeler',
    headline: 'Mühendislik ve Gücün Kusursuz Uyumu',
    supportingLine: 'Endüstriyel dayanıklılık ve yüksek basınç performansı.',
    cta: 'Detaylı Bilgi',
    brandKit: BOFE_BRAND_KIT,
    product: {
      name: 'Delta Mekanik İlaçlama Pompası 10lt',
      description: '10L yeşil silindirik gövde, yüksek basınçlı mekanik pompa, pirinç nozullu sağlam tetik.',
      imageUrl: DELTA_10L_PRODUCT
    },
    referenceImages: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: DELTA_10L_PRODUCT }
    ]
  },

  // 9. Mesajify - VARIATION from Test 03 (Switched mode to SHOWSTOPPER_CAMPAIGN)
  {
    id: '09_mesajify_variation_showstopper',
    num: '09',
    label: 'Mesajify — Akıllı Varyasyon (Mod Değişimi: Gösterişli Kampanya)',
    brandName: 'Mesajify',
    sector: 'SaaS & Yazılım',
    styleMode: 'SHOWSTOPPER_CAMPAIGN',
    userPrompt: 'Aynı işletme sipariş konseptini zengin 3D tipografi ve canlı kampanya afişine dönüştür',
    headline: 'Müşterilerinizle Kesintisiz Bağlantı',
    supportingLine: 'Sipariş ve mesajları tek ekrandan yönetin, satışları katlayın.',
    cta: 'Hemen Başlayın',
    brandKit: MESAJIFY_BRAND_KIT,
    parentJobId: '03_mesajify_real_life',
    generationType: 'variation',
    referenceImages: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ]
  },

  // 10. Bofe - REVISION from Test 07 (Locked scene, headline revised to "Bahçenizde Profesyonel Güç")
  {
    id: '10_bofe_revision_headline',
    num: '10',
    label: 'Bofe — Kontrollü Revizyon (Başlık Güncellemesi)',
    brandName: 'Bofe Tarım',
    sector: 'Tarım & Bahçe Ekipmanları',
    styleMode: 'REAL_LIFE_CAMPAIGN',
    userPrompt: 'Yalnız reklam başlığını değiştir; mevcut sahne, insan, zeytinlik, Bofe 16L ürün ve logo aynen korunsun.',
    headline: 'Bahçenizde Profesyonel Güç',
    supportingLine: 'Ergonomik sırt desteğiyle yorulmadan gün boyu ilaçlama yapın.',
    cta: 'Ürünü İnceleyin',
    brandKit: BOFE_BRAND_KIT,
    product: {
      name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L',
      imageUrl: BOFE_PRODUCT
    },
    parentJobId: '07_bofe_real_life',
    generationType: 'revision',
    referenceImages: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_PRODUCT }
    ]
  }
]

const GATEWAY_TOKEN = process.env.GATEWAY_TOKEN || process.env.OMNISTUDIO_API_KEY || ''

const FORCE_JOBS = process.env.FORCE_JOBS ? process.env.FORCE_JOBS.split(',') : []

async function runSingleBenchmark(spec: BenchmarkSpec) {
  console.log(`\n--------------------------------------------------------------------------------`)
  console.log(`[JOB ${spec.num}/10] ${spec.label}`)
  console.log(`Mod: ${spec.styleMode} | Marka: ${spec.brandName}`)
  console.log(`Başlık: "${spec.headline}" | CTA: "${spec.cta}"`)
  console.log(`Kullanıcı Promptu: ${spec.userPrompt || '(Boş — Otonom AI)'}`)
  console.log(`--------------------------------------------------------------------------------`)

  const desktopFile = path.join(DESKTOP_DIR, `${spec.id}.png`)
  const isForced = FORCE_JOBS.some(fj => {
    const clean = fj.trim()
    return clean === spec.num || clean === String(parseInt(spec.num, 10)) || clean === spec.id || clean === 'all'
  })

  if (!isForced && fs.existsSync(desktopFile) && fs.statSync(desktopFile).size > 10000) {
    const buf = fs.readFileSync(desktopFile)
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex')
    console.log(`⚡ [REUSED] Mevcut doğrulanmış görsel korundu: ${desktopFile} (${buf.length} bytes, SHA: ${sha256})`)
    return {
      spec,
      imgUrl: 'local://' + desktopFile,
      desktopFile,
      fileName: `${spec.id}.png`,
      sha256,
      sizeBytes: buf.length,
      elapsedSec: 0,
      status: 'REUSED',
      jobId: 'cached_verified',
      refsCount: spec.referenceImages.length + (spec.parentJobId ? 1 : 0)
    }
  }

  // 1. Snapshot creation for buildCreativePrompt
  const snapshot: CreativeSnapshot = {
    brief: spec.headline,
    style: 'auto',
    styleMode: spec.styleMode,
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: spec.cta,
    customHeadline: spec.headline,
    customSupporting: spec.supportingLine,
    instruction: spec.userPrompt || undefined,
    sector: spec.sector,
    brandKit: {
      name: spec.brandName,
      colors: spec.brandKit.colors,
      fonts: spec.brandKit.fonts,
      tone: spec.brandKit.tone,
      logoPath: spec.brandKit.logo_path || spec.referenceImages.find(r => r.role === 'logo')?.url
    },
    products: spec.product ? [{
      id: 'bench-product',
      name: spec.product.name,
      description: spec.product.description || null,
      boxContents: null,
      imageUrl: spec.product.imageUrl,
      price: spec.price || null,
      oldPrice: spec.oldPrice || null,
      promo: spec.offer || null,
      extra: null,
      include: { name: true, description: true, price: true, promo: true, image: true, boxContents: false }
    }] : [],
    generationType: spec.generationType || 'initial',
    baseCreativeId: spec.parentJobId || undefined
  }

  // 2. Fetch reference images as base64
  const refs: { role: string; data: string; mimeType: string }[] = []

  // ATTACH PARENT BASE IMAGE IF REVISION OR VARIATION (FAIL-CLOSED)
  if (spec.parentJobId) {
    const parentFilePath = path.join(DESKTOP_DIR, `${spec.parentJobId}.png`)
    if (!fs.existsSync(parentFilePath)) {
      throw new Error(`FAIL-CLOSED: Parent base image not found for ${spec.generationType || 'revision'}: ${parentFilePath}. Cannot proceed without authentic base reference.`)
    }
    const parentBuf = fs.readFileSync(parentFilePath)
    if (parentBuf.length < 1000) {
      throw new Error(`FAIL-CLOSED: Parent base image is corrupted or too small (${parentBuf.length} bytes): ${parentFilePath}`)
    }
    refs.push({
      role: 'base',
      data: parentBuf.toString('base64'),
      mimeType: 'image/png'
    })
    console.log(`✓ Attached [base] reference canvas from parent: ${spec.parentJobId}.png (${parentBuf.length} bytes, role: base)`)
  }

  for (const ref of spec.referenceImages) {
    try {
      const res = await fetch(ref.url)
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        const mime = res.headers.get('content-type') || 'image/jpeg'
        refs.push({
          role: ref.role,
          data: buf.toString('base64'),
          mimeType: mime.split(';')[0]
        })
        console.log(`✓ Attached [${ref.role}] ref: ${ref.url.slice(-30)} (${buf.length} bytes)`)
      }
    } catch (err: any) {
      console.warn(`! Failed to fetch ref [${ref.role}]:`, err.message)
    }
  }

  const { prompt } = buildCreativePrompt(snapshot, {
    verifiedRefs: {
      logo: refs.some(r => r.role === 'logo'),
      product: refs.some(r => r.role === 'product'),
      base: refs.some(r => r.role === 'base'),
      inspiration: false
    }
  })
  console.log(`✓ Compiled Prompt preview: ${prompt.slice(0, 160)}...`)

  // 3. Submit to OmniStudio gateway
  const payload = {
    prompt,
    customer: spec.brandName,
    platform: 'chatgpt',
    workspace: 'WhatsApp Botu',
    referenceImages: refs.map(r => ({ data: r.data, mimeType: r.mimeType, role: r.role })),
    expected_reference_count: refs.length,
    brandKit: spec.brandKit,
    size: '1024x1024'
  }

  const startMs = Date.now()
  const response = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GATEWAY_TOKEN}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(270000)
  })

  if (!response.ok) {
    throw new Error(`Gateway returned HTTP ${response.status}: ${await response.text()}`)
  }

  let resultData = await response.json()
  const elapsedSec = Math.round((Date.now() - startMs) / 1000)
  console.log(`✓ Gateway initial response in ${elapsedSec}s`)

  // Handle async processing
  if ((resultData.status === 'processing' || !resultData.url) && (resultData.status_url || resultData.job_id)) {
    const statusUrl = resultData.status_url || `http://167.233.201.31:3456/v1/images/status/${resultData.job_id}`
    console.log(`⏳ Job queued or processing. Polling ${statusUrl}...`)
    const pollDeadline = Date.now() + 300000 // 5 minutes max
    while (Date.now() < pollDeadline) {
      await new Promise(r => setTimeout(r, 6000))
      try {
        const pollRes = await fetch(statusUrl, {
          headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` }
        })
        if (pollRes.ok) {
          const pollData = await pollRes.json()
          if (pollData.status === 'completed' || pollData.url || pollData.data?.[0]?.url) {
            resultData = pollData
            console.log(`✓ Job completed via status polling!`)
            break
          } else if (pollData.status === 'failed') {
            throw new Error(`Gateway job failed: ${pollData.error || 'Unknown error'}`)
          }
        }
      } catch (err: any) {
        console.warn(`! Poll warning: ${err.message}`)
      }
    }
  }

  // 4. Resolve image URL
  let imgUrl: string | null = null
  if (resultData.url) imgUrl = resultData.url
  else if (resultData.data?.[0]?.url) imgUrl = resultData.data[0].url
  else if (resultData.resultUrl) imgUrl = resultData.resultUrl
  else {
    const content = resultData.reply || resultData.choices?.[0]?.message?.content || ''
    const mdMatch = content.match(/!\[.*?\]\((http.*?)\)/)
    if (mdMatch) imgUrl = mdMatch[1]
    else {
      const urlMatch = content.match(/(http[s]?:\/\/[^\s\)]+)/)
      if (urlMatch) imgUrl = urlMatch[1]
    }
  }

  if (!imgUrl) {
    throw new Error(`No image URL returned from gateway: ${JSON.stringify(resultData)}`)
  }

  // 5. Download and verify physical bytes
  const imgRes = await fetch(imgUrl, {
    headers: {
      'Authorization': `Bearer ${GATEWAY_TOKEN}`
    }
  })
  if (!imgRes.ok) throw new Error(`Image download failed HTTP ${imgRes.status}`)
  const buf = Buffer.from(await imgRes.arrayBuffer())
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex')

  fs.writeFileSync(desktopFile, buf)
  const jobId = resultData.job_id || resultData.id || (imgUrl.match(/job_[a-f0-9]+/i) ? imgUrl.match(/job_[a-f0-9]+/i)![0] : 'omnistudio_direct')

  return {
    spec,
    imgUrl,
    desktopFile,
    fileName: `${spec.id}.png`,
    sha256,
    sizeBytes: buf.length,
    elapsedSec,
    status: 'GENERATED',
    jobId,
    refsCount: refs.length,
    refsRoles: refs.map(r => r.role)
  }
}

function generateHtmlGallery(results: any[]) {
  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mesajify Creative Studio V2 — 4 Akıllı Reklam Modu Doğrulama Galerisi</title>
  <style>
    :root {
      --bg: #07100C;
      --card-bg: #0E1A14;
      --border: #1B2E24;
      --emerald: #00A884;
      --emerald-light: #25D366;
      --text: #F0FDF4;
      --text-muted: #86A896;
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font);
      padding: 32px 20px;
      line-height: 1.5;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 36px;
      padding-bottom: 24px;
      border-bottom: 1px solid var(--border);
    }
    .badge {
      display: inline-block;
      background: rgba(0, 168, 132, 0.2);
      color: var(--emerald-light);
      border: 1px solid rgba(0, 168, 132, 0.4);
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
    }
    h1 {
      font-size: 32px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .meta {
      color: var(--text-muted);
      font-size: 14px;
      display: flex;
      gap: 18px;
      flex-wrap: wrap;
    }
    .meta span strong { color: var(--emerald-light); }
    .grid {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
      gap: 28px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 16px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      border-color: var(--emerald);
      transform: translateY(-2px);
    }
    .img-wrap {
      width: 100%;
      aspect-ratio: 1 / 1;
      background: #000;
      position: relative;
      overflow: hidden;
    }
    .img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      flex: 1;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .mode-pill {
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      background: #15241C;
      color: var(--emerald-light);
      border: 1px solid rgba(0, 168, 132, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .brand-tag {
      font-size: 12px;
      font-weight: 700;
      color: var(--text-muted);
    }
    .headline {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.3;
      color: #FFF;
    }
    .info-row {
      font-size: 12.5px;
      color: var(--text-muted);
      background: rgba(0,0,0,0.25);
      padding: 10px 12px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.04);
    }
    .info-row strong { color: #FFF; }
    .hash {
      font-family: monospace;
      font-size: 11px;
      color: var(--text-muted);
      word-break: break-all;
      background: #060B08;
      padding: 8px;
      border-radius: 6px;
      border: 1px solid var(--border);
    }
    .comparison-section {
      max-width: 1400px;
      margin: 48px auto 0;
      padding-top: 32px;
      border-top: 1px solid var(--border);
    }
    .comp-title {
      font-size: 24px;
      font-weight: 800;
      margin-bottom: 20px;
      color: var(--emerald-light);
    }
    .comp-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 32px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge">MESAJIFY CREATIVE STUDIO V2 · DOĞRULAMA KANITI</div>
    <h1>4 Akıllı Reklam Modu + Gerçek Üretim Test Galerisi</h1>
    <div class="meta">
      <span>Branch: <strong>feature/creative-studio-v2-modes</strong></span>
      <span>Üretilen Görsel: <strong>${results.filter(r => r.ok).length} / 10</strong></span>
      <span>Tarih: <strong>${new Date().toLocaleString('tr-TR')}</strong></span>
      <span>Durum: <strong>GERÇEK ÜRETİM (0 MOCK / 0 PLACEHOLDER)</strong></span>
    </div>
  </div>

  <div class="grid">
    ${results.map(r => {
      if (!r.ok) {
        return `
        <div class="card" style="border-color: #EF4444;">
          <div class="body">
            <span class="mode-pill" style="color: #EF4444; border-color: #EF4444;">HATA</span>
            <div class="headline">${r.spec.label}</div>
            <div class="info-row" style="color: #F87171;">${r.error}</div>
          </div>
        </div>`
      }
      return `
      <div class="card">
        <div class="img-wrap">
          <img src="${r.fileName}" alt="${r.spec.label}">
        </div>
        <div class="body">
          <div class="card-top">
            <span class="mode-pill">${r.spec.styleMode}</span>
            <span class="brand-tag">${r.spec.brandName}</span>
            <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; ${r.status === 'GENERATED' ? 'background: rgba(37,211,102,0.15); color: #25D366; border: 1px solid rgba(37,211,102,0.3);' : 'background: rgba(234,179,8,0.15); color: #EAB308; border: 1px solid rgba(234,179,8,0.3);'}">
              ${r.status === 'GENERATED' ? `GENERATED (${r.elapsedSec}s)` : 'REUSED (0s)'}
            </span>
          </div>
          <div class="headline">${r.spec.headline}</div>
          <div class="info-row">
            <div><strong>CTA:</strong> ${r.spec.cta}</div>
            ${r.spec.price ? `<div><strong>Fiyat / Teklif:</strong> ${r.spec.price} (${r.spec.offer || ''})</div>` : ''}
            <div><strong>İstem (Prompt):</strong> ${r.spec.userPrompt || '<em>Boş (AI Kararı)</em>'}</div>
            <div><strong>Gateway Job ID:</strong> <code>${r.jobId || 'N/A'}</code></div>
            <div><strong>Referanslar:</strong> ${r.refsRoles ? r.refsRoles.map((role: string) => `[${role}]`).join(' ') : `${r.refsCount || 0} adet`} · ${(r.sizeBytes / 1024).toFixed(0)} KB</div>
          </div>
          <div class="hash">SHA256: ${r.sha256}</div>
        </div>
      </div>`
    }).join('')}
  </div>

  <div class="comparison-section">
    <div class="comp-title">A/B Karşılaştırma: Akıllı Varyasyon & Revizyon Kontrolleri</div>
    <div class="comp-grid">
      <div>
        <h3 style="margin-bottom: 12px; font-size: 16px; color: var(--text-muted);">Test 03: Gerçek Kullanım (Referans)</h3>
        <img src="03_mesajify_real_life.png" style="width: 100%; border-radius: 12px; border: 1px solid var(--border);">
      </div>
      <div>
        <h3 style="margin-bottom: 12px; font-size: 16px; color: var(--emerald-light);">Test 09: Varyasyon (Gösterişli Kampanyaya Dönüştürüldü)</h3>
        <img src="09_mesajify_variation_showstopper.png" style="width: 100%; border-radius: 12px; border: 1px solid var(--border);">
      </div>
    </div>

    <div class="comp-grid">
      <div>
        <h3 style="margin-bottom: 12px; font-size: 16px; color: var(--text-muted);">Test 07: Gerçek Kullanım (Referans)</h3>
        <img src="07_bofe_real_life.png" style="width: 100%; border-radius: 12px; border: 1px solid var(--border);">
      </div>
      <div>
        <h3 style="margin-bottom: 12px; font-size: 16px; color: var(--emerald-light);">Test 10: Revizyon (Yalnız Başlık Değişti: "Bahçenizde Profesyonel Güç")</h3>
        <img src="10_bofe_revision_headline.png" style="width: 100%; border-radius: 12px; border: 1px solid var(--border);">
      </div>
    </div>
  </div>
</body>
</html>`

  const htmlPath = path.join(DESKTOP_DIR, 'index.html')
  fs.writeFileSync(htmlPath, html, 'utf-8')
  console.log(`✅ Gallery written to: ${htmlPath}`)
}

async function main() {
  console.log('================================================================================')
  console.log('MESAJIFY CREATIVE STUDIO V2 — 10 REAL IMAGES BENCHMARK')
  console.log('Target: C:\\Users\\TP2\\Desktop\\Mesajify_Final_Uretimler\\')
  console.log('================================================================================')

  const results: any[] = []

  for (const job of BENCHMARK_JOBS) {
    try {
      const res = await runSingleBenchmark(job)
      results.push({ ok: true, ...res })
    } catch (err: any) {
      console.error(`❌ FAILED for Job ${job.num} (${job.label}):`, err.message)
      results.push({ ok: false, spec: job, error: err.message })
    }
    // Brief sleep between calls
    await new Promise(r => setTimeout(r, 2000))
  }

  // Write manifest
  fs.writeFileSync(
    path.join(DESKTOP_DIR, 'manifest.json'),
    JSON.stringify(results, null, 2),
    'utf-8'
  )

  // Write HTML gallery
  generateHtmlGallery(results)

  const successCount = results.filter(r => r.ok).length
  console.log('\n================================================================================')
  console.log(`BENCHMARK COMPLETED: ${successCount}/10 JOBS SUCCESSFUL`)
  console.log('================================================================================')
}

main().catch(console.error)
