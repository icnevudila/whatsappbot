import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: path.resolve('apps/customer/.env.local') })

const envFile = fs.readFileSync('apps/customer/.env.local', 'utf8')
const tokenMatch = envFile.match(/OMNISTUDIO_GATEWAY_TOKEN="?([^"\n\r]+)"?/)
const token = tokenMatch ? tokenMatch[1] : ''

const supabaseUrl = 'https://rnkrjmblgcdqlyslbhob.supabase.co'
const supabaseAnonKey = 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB'
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Mesajify assets
const MESAJIFY_UI = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/2881f690-6853-4064-8768-307463ae6255/products/2f047fbe-a90c-4bdc-b472-d969031048e1/0c2a3629-35d5-4d3a-bdc1-d13dad24f8e1.jpg'
const MESAJIFY_LOGO = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/2881f690-6853-4064-8768-307463ae6255/original-logo-e383102bc1be7a58.png'

// Bofe assets
const BOFE_16L_PRODUCT = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/products/b359ccd3-1616-4000-8000-000000000016/7f776e2c-adf2-45ac-8e99-21e8ac782013.jpg'
const BOFE_LOGO = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/kits/5bd94b86-156a-450f-99b1-4b4a650179d2/logo.jpg'

interface ProductionJob {
  id: string
  title: string
  brand: string
  sector: string
  fileName: string
  prompt: string
  negativePrompt: string
  refs: { role: string; url: string }[]
}

const JOBS: ProductionJob[] = [
  // 1. MESAJIFY — SHOWSTOPPER V3 (Bold Editorial & High-Converting Action Cards, NO NEON)
  {
    id: 'mesajify_showstopper_v3_action_cards',
    title: 'Mesajify — Gösterişli V3 (Bold Editorial & Canlı Aksiyon Kartları)',
    brand: 'Mesajify',
    sector: 'SaaS / WhatsApp CRM',
    fileName: 'v4_01_mesajify_showstopper_action_cards.png',
    refs: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ],
    prompt: `A high-impact, professional commercial social media campaign advertisement for Mesajify WhatsApp CRM platform.
Format: 1:1 square. Turkish audience.
NO CHEAP NEON GLOW, NO PLASTIC 3D HOLOGRAMS, NO GENERIC WIREFRAMES, NO FORCED LAPTOP.
Pristine commercial advertising agency aesthetic with high conversion rate optimization:
- HEADER: Official emerald Mesajify logo at the top. Bold, commanding editorial typography: "WHATSAPP İLE MÜŞTERİ İLETİŞİMİNİZİ BÜYÜTÜN". Subtitle: "Toplu kampanya, gelen kutusu ve kitle yönetimi tek ekranda."
- CENTER HERO: The authentic Mesajify dashboard application interface displayed on a sleek, ultra-thin borderless tablet or crisp floating glass panel with natural soft studio shadow.
- ACTION CARDS / INTERACTIVE CTA TRIGGERS: Beside and overlapping the main dashboard are 2 distinct, tactile, high-contrast action cards that look physically clickable:
  1. Action Card: "[ 🚀 Toplu Mesaj Başlat ] → 1.450 Müşteriye Ulaştı"
  2. Action Card: "[ 💬 Canlı Gelen Kutusu ] → Tek tıkla yanıtlayın"
- PRIMARY CTA: A commanding, vibrant emerald-green pill button at the bottom: "ŞİMDİ ÜCRETSİZ BAŞLAYIN →" with a subtle micro-text below: "Kredi kartı gerekmez • 2 dakikada kurulum".
- LIGHTING & AMBIANCE: Natural bright studio daylight with sophisticated soft emerald and white background gradient. High contrast, sharp text, generous breathing room.`,
    negativePrompt: 'dark neon background, laser beams, cheap green glowing lines, plastic 3D icons, people looking at laptop, stock photo office, low resolution, warped text'
  },

  // 2. MESAJIFY — SHOWSTOPPER V3 (Cinematic Software Hero — Alternatif Kompozisyon)
  {
    id: 'mesajify_showstopper_v3_cinematic_hero',
    title: 'Mesajify — Gösterişli V3 (Cinematic Product Hero)',
    brand: 'Mesajify',
    sector: 'SaaS / WhatsApp CRM',
    fileName: 'v4_02_mesajify_showstopper_cinematic_hero.png',
    refs: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ],
    prompt: `An authoritative, cinematic commercial advertising poster for Mesajify WhatsApp CRM.
Format: 1:1 square. Turkish audience.
CONFIDENT CINEMATIC HERO COMPOSITION (NO NEON):
- Asymmetric modern layout: Left side features monumental, high-impact advertising typography: "SATIŞLARINIZI WHATSAPP İLE KATLAYIN".
- The authentic Mesajify software interface is presented as a monumental, precision-crafted floating slate with authentic UI analytics and campaign metrics.
- High-converting Action Badge: "[ 📈 %98 Açılma Oranı ]".
- Primary prominent action CTA button: "HEMEN İNCELEYİN →".
- LIGHTING: Clean, high-end commercial daylight studio with soft directional architectural shadows, crisp matte materials, zero neon clutter.`,
    negativePrompt: 'neon glow, lens flare, green laser wires, dark dingy room, stock models, heavy laptop, cluttered badges'
  },

  // 3. MESAJIFY — GERÇEK KULLANIM V2 (Direct Action & Touch Interaction)
  {
    id: 'mesajify_real_life_v2_action_touch',
    title: 'Mesajify — Gerçek Kullanım V2 (Aksiyon & Dokunma Anı)',
    brand: 'Mesajify',
    sector: 'SaaS / WhatsApp CRM',
    fileName: 'v4_03_mesajify_real_life_action_touch.png',
    refs: [
      { role: 'logo', url: MESAJIFY_LOGO },
      { role: 'product', url: MESAJIFY_UI }
    ],
    prompt: `An authentic, high-converting commercial lifestyle advertisement for Mesajify WhatsApp platform.
Format: 1:1 square. Turkish audience.
STORY & DIRECT INTERACTION:
- SCENE: A charismatic, smiling young Turkish female boutique business owner in a stylish modern sunlit workspace or boutique cafe.
- ACTION: She is holding an iPhone displaying the Mesajify WhatsApp inbox, and her thumb is actively tapping the bright green "[ Gönder ]" button on the screen with genuine delight.
- AD OVERLAY: Clean Mesajify logo in the corner, clear headline: "Müşterilerinizle Anında Satışa Dönüşen İletişim", prominent green CTA button: "Panelinizi Oluşturun →".
- REALISM: Believable warm sunlight, authentic skin texture, realistic hands, zero stock cheese.`,
    negativePrompt: 'deformed hands, extra fingers, cartoon, stiff pose, dark room, neon, giant laptop covering face'
  },

  // 4. BOFE TARIM — SHOWSTOPPER V3 (Cinematic Product Hero — Tarım)
  {
    id: 'bofe_showstopper_v3_cinematic_hero',
    title: 'Bofe Tarım — Gösterişli V3 (Cinematic Product Hero — Tarım)',
    brand: 'Bofe Tarım',
    sector: 'Tarım / Donanım',
    fileName: 'v4_04_bofe_showstopper_cinematic_hero.png',
    refs: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_16L_PRODUCT }
    ],
    prompt: `A powerful, monumental commercial advertising poster for Bofe 16L Akülü Sırt Tipi İlaçlama Pompası.
Format: 1:1 square. Turkish audience.
CINEMATIC PRODUCT HERO (PHYSICAL PRODUCT — ZERO LAPTOP, ZERO NEON):
- HERO PRODUCT: The authentic Bofe 16L electric backpack sprayer with light blue tank and stainless lance positioned proudly in the center at heroic monumental scale.
- HEADLINE: Massive, commanding bold typography: "PROFESYONEL İLAÇLAMADA YENİ GÜÇ!".
- BENEFIT CHIPS: Clean, tactile benefit tags: "[ 16L Geniş Hazne ]", "[ Lityum Akülü Otomatik Basınç ]".
- PRIMARY CTA: High-contrast green button: "HEMEN SİPARİŞ VERİN →".
- ENVIRONMENT: Golden morning sunlight in an expansive olive orchard, clean soil, cinematic depth of field, authentic commercial agricultural advertisement.`,
    negativePrompt: 'laptop, computer screen, indoor office, neon glow, cartoon, altered pump color, extra logos'
  }
]

async function run() {
  console.log('========================================================================')
  console.log('🚀 CODEX SHOWSTOPPER V3 & QUALITY REFINEMENTS GENERATION SUITE')
  console.log('========================================================================\n')

  const results = []
  const desktopDir = 'C:\\Users\\TP2\\Desktop\\Mesajify_Varyasyon_Ornekleri'
  const brainDir = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270'

  fs.mkdirSync(desktopDir, { recursive: true })
  fs.mkdirSync(brainDir, { recursive: true })

  for (const job of JOBS) {
    console.log(`\n------------------------------------------------------`)
    console.log(`[BAŞLATILIYOR] ${job.title} (${job.id})...`)
    console.log(`------------------------------------------------------`)

    const res = await fetch('http://167.233.201.31:3456/v1/images/generations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        prompt: job.prompt,
        size: '1024x1024',
        response_format: 'url',
        referenceImages: job.refs
      })
    })

    const json = await res.json()
    console.log('Gateway response status:', res.status, json.job_id || json.id || '')

    let imgUrl = ''
    if (json.data && json.data[0] && json.data[0].url) {
      imgUrl = json.data[0].url
    } else if (json.id) {
      console.log(`Job queued: ${json.id}. Polling...`)
      while (!imgUrl) {
        await new Promise(r => setTimeout(r, 4000))
        const poll = await fetch(`http://167.233.201.31:3456/v1/images/generations/${json.id}`, {
          headers: { 'authorization': `Bearer ${token}` }
        })
        const pollJson = await poll.json()
        console.log(`Status: ${pollJson.status}`)
        if (pollJson.status === 'succeeded' || pollJson.status === 'completed') {
          imgUrl = pollJson.url || (pollJson.data && pollJson.data[0] && pollJson.data[0].url)
        } else if (pollJson.status === 'failed') {
          throw new Error('Generation failed: ' + pollJson.error)
        }
      }
    }

    if (!imgUrl) {
      console.error(`Failed to get URL for ${job.id}`)
      continue
    }

    console.log(`Downloading: ${imgUrl}...`)
    const imgRes = await fetch(imgUrl, {
      headers: { 'authorization': `Bearer ${token}` }
    })
    const buf = Buffer.from(await imgRes.arrayBuffer())

    const destDesktop = path.join(desktopDir, job.fileName)
    const destBrain = path.join(brainDir, job.fileName)
    fs.writeFileSync(destDesktop, buf)
    fs.writeFileSync(destBrain, buf)
    console.log(`Saved locally: ${destDesktop} (${(buf.length / 1024).toFixed(1)} KB)`)

    // Upload to Supabase public bucket
    const storagePath = `public-assets/style-previews/${job.fileName}`
    const { error: upErr } = await supabase.storage.from('creatives').upload(storagePath, buf, {
      contentType: 'image/png',
      upsert: true
    })
    if (upErr) {
      console.error(`Supabase upload error for ${job.id}:`, upErr)
    }

    const { data: pubUrl } = supabase.storage.from('creatives').getPublicUrl(storagePath)
    console.log(`✅ Uploaded to Supabase: ${pubUrl.publicUrl}`)

    results.push({
      id: job.id,
      title: job.title,
      brand: job.brand,
      sector: job.sector,
      fileName: job.fileName,
      sizeKb: (buf.length / 1024).toFixed(1),
      desktopPath: destDesktop,
      publicUrl: pubUrl.publicUrl
    })
  }

  console.log('\n======================================================')
  console.log('🎉 TÜM CODEX V3 VARYASYONLARI TAMAMLANDI!')
  console.log('======================================================')
  console.log(JSON.stringify(results, null, 2))
}

run().catch(console.error)
