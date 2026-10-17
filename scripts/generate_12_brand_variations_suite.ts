import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.resolve('apps/customer/.env.local') })

const envFile = fs.readFileSync('apps/customer/.env.local', 'utf8')
const tokenMatch = envFile.match(/OMNISTUDIO_GATEWAY_TOKEN="?([^"\n\r]+)"?/)
const token = tokenMatch ? tokenMatch[1] : ''

const BOFE_16L_PRODUCT = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/products/b359ccd3-1616-4000-8000-000000000016/7f776e2c-adf2-45ac-8e99-21e8ac782013.jpg'
const BOFE_LOGO = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/kits/5bd94b86-156a-450f-99b1-4b4a650179d2/logo.jpg'

const stagingDir = 'C:\\Users\\TP2\\.gemini\\antigravity\\brain\\30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270\\Creative_Studio_12_Varyasyon'
fs.mkdirSync(stagingDir, { recursive: true })

// Existing verified images to copy directly:
const EXISTING_MAP: Record<string, string> = {
  '01_mesajify_akilli_kampanya.png': 'C:\\Users\\TP2\\Desktop\\Mesajify_Varyasyon_Ornekleri\\chatgpt_ref_01_akilli_kampanya.png',
  '02_mesajify_gosterisli_kampanya.png': 'C:\\Users\\TP2\\Desktop\\Mesajify_Varyasyon_Ornekleri\\v4_01_mesajify_showstopper_action_cards.png',
  '03_mesajify_gercek_kullanim.png': 'C:\\Users\\TP2\\Desktop\\Mesajify_Varyasyon_Ornekleri\\v4_03_mesajify_real_life_action_touch.png',
  '04_mesajify_premium_vitrin.png': 'C:\\Users\\TP2\\Desktop\\Mesajify_Varyasyon_Ornekleri\\chatgpt_ref_04_premium_vitrin.png',
  '06_bofe_gosterisli_kampanya.png': 'C:\\Users\\TP2\\Desktop\\Mesajify_Varyasyon_Ornekleri\\v4_04_bofe_showstopper_cinematic_hero.png',
}

interface NewJob {
  fileName: string
  title: string
  brand: string
  style: string
  prompt: string
  negativePrompt: string
  refs?: { role: string; url: string }[]
}

const NEW_JOBS: NewJob[] = [
  // 5. BOFE TARIM — AKILLI KAMPANYA
  {
    fileName: '05_bofe_akilli_kampanya.png',
    title: 'Bofe Tarım — Akıllı Kampanya (Ürün ve Fayda Odaklı B2B Reklam)',
    brand: 'Bofe Tarım',
    style: 'SMART_CAMPAIGN',
    refs: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_16L_PRODUCT }
    ],
    prompt: `A clean, modern, high-converting commercial social media advertisement for Bofe Tarım 16L Akülü Sırt İlaçlama Pompası.
Format: 1:1 square. Turkish audience.
ZERO LAPTOP, ZERO COMPUTER SCREENS.
- UPPER: Official Bofe Tarım logo in forest green. Clear, readable headline: "Bahçenizde ve Tarlanızda Güçlü İlaçlama". Subtitle: "16L geniş hazne ve lityum batarya ile yorulmadan tam gün verim."
- CENTER: The authentic Bofe 16L electric backpack sprayer with light blue tank and stainless lance clearly showcased in sharp focus on a clean white/soft sage-green gradient background with natural soft shadow.
- ACTION CHIPS: Two clean white pill badges: "[ 16L Geniş Kapasite ]", "[ Lityum Akülü Otomatik Basınç ]".
- CTA: High-contrast green button: "Hemen İnceleyin →".
- MOOD: Professional, direct, trustworthy commercial agricultural ad.`,
    negativePrompt: 'laptop, computer, screens, dark background, neon, deformed equipment, people blocking product'
  },

  // 7. BOFE TARIM — GERÇEK KULLANIM
  {
    fileName: '07_bofe_gercek_kullanim.png',
    title: 'Bofe Tarım — Gerçek Kullanım (Zeytinlikte Çiftçi & Doğal Kullanım Anı)',
    brand: 'Bofe Tarım',
    style: 'REAL_LIFE_CAMPAIGN',
    refs: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_16L_PRODUCT }
    ],
    prompt: `An authentic, warm commercial lifestyle photograph for Bofe Tarım 16L Akülü Sırt Pompası.
Format: 1:1 square. Turkish audience.
HUMAN & STORY-FIRST:
- SCENE: A smiling, experienced Turkish farmer or agricultural specialist in a sunlit olive orchard during golden morning light.
- ACTION: He is comfortably wearing the Bofe 16L blue electric backpack sprayer with ergonomic padded straps, spraying olive tree branches with a fine mist and a confident, genuine smile.
- PRODUCT FIDELITY: The authentic light blue Bofe 16L tank with Bofe logo and stainless lance is clearly recognizable.
- AD OVERLAY: Clean Bofe logo in corner, warm headline: "Tarlada Yorulmadan Tam Gün Güç", prominent green CTA: "Ürünü İnceleyin →".
- REALISM: Believable natural sunshine, realistic outdoor agricultural setting, zero stock artificiality.`,
    negativePrompt: 'laptop, computer, artificial indoor studio, deformed hands, cartoon, neon, wrong tank color'
  },

  // 8. BOFE TARIM — PREMIUM VİTRİN
  {
    fileName: '08_bofe_premium_vitrin.png',
    title: 'Bofe Tarım — Premium Vitrin (Endüstriyel Heykelsi Taş Podyum)',
    brand: 'Bofe Tarım',
    style: 'PREMIUM_SHOWCASE',
    refs: [
      { role: 'logo', url: BOFE_LOGO },
      { role: 'product', url: BOFE_16L_PRODUCT }
    ],
    prompt: `An ultra-luxurious, minimalist premium B2B commercial showcase for Bofe Tarım 16L Akülü Sırt Pompası.
Format: 1:1 square. Turkish audience.
ARCHITECTURAL MINIMALISM & QUIET LUXURY (ZERO COMPUTER, ZERO SCREENS):
- ENVIRONMENT: Premium architectural daylight studio. A raw dark basalt stone or honed concrete block podium.
- PRESENTATION: The pristine Bofe 16L electric sprayer positioned sculpturally on the podium, showing its clean industrial form, polished lance, and authentic blue tank.
- LIGHTING: Exquisite directional architectural sunlight casting long diagonal shadows. Subtle olive branch shadow in corner.
- TYPOGRAPHY: Refined Swiss editorial typography: "Mühendislik ve Gücün Buluştuğu Nokta", minimalist outline CTA button: "Teknik Özellikleri Keşfet →".
- MOOD: High-end industrial prestige, generous negative space, zero clutter.`,
    negativePrompt: 'laptop, screens, office workers, cartoon, cheap plastic look, neon beams, clutter'
  },

  // 9. AYVAZOĞLU İNŞAAT — AKILLI KAMPANYA
  {
    fileName: '09_ayvazoglu_akilli_kampanya.png',
    title: 'Ayvazoğlu İnşaat — Akıllı Kampanya (Paletli Tuğla & Şantiye Teslimi)',
    brand: 'Ayvazoğlu İnşaat',
    style: 'SMART_CAMPAIGN',
    prompt: `A clean, modern, high-converting commercial social media advertisement for Ayvazoğlu İnşaat 13.5 Standart Kil Tuğla.
Format: 1:1 square. Turkish audience.
ZERO COMPUTER SCREENS, ZERO LAPTOP.
- UPPER: Ayvazoğlu İnşaat corporate logo and bold dark-charcoal headline: "Sağlam Yapıların Kaliteli Tuğlası". Subtitle: "TSE belgeli standart klinker kil tuğla fabrikadan doğrudan şantiyenize."
- CENTER: A neat, architectural pallet stack of warm terracotta-red 13.5 standard hollow clay bricks in sharp focus on a clean light-gray stone background with soft natural shadow.
- ACTION CHIPS: "[ TSE & ISO Belgeli ]", "[ Fabrika Satış Fiyatı ]".
- CTA BUTTON: High-contrast terracotta-orange pill button: "Toptan Fiyat Teklifi Alın →".
- MOOD: Professional, direct, trustworthy building materials B2B ad.`,
    negativePrompt: 'laptop, computer, screens, dark neon, ruined bricks, cartoon, messy construction dirt'
  },

  // 10. AYVAZOĞLU İNŞAAT — GÖSTERİŞLİ KAMPANYA
  {
    fileName: '10_ayvazoglu_gosterisli_kampanya.png',
    title: 'Ayvazoğlu İnşaat — Gösterişli Kampanya (Sinematik Şantiye Kahramanı & Dev Tipografi)',
    brand: 'Ayvazoğlu İnşaat',
    style: 'SHOWSTOPPER_CAMPAIGN',
    prompt: `A powerful, monumental commercial advertising poster for Ayvazoğlu İnşaat.
Format: 1:1 square. Turkish audience.
CINEMATIC PRODUCT HERO (CONSTRUCTION INDUSTRY — ZERO LAPTOP, ZERO NEON):
- HERO PRODUCT: Monumental, heroic close-up of premium warm terracotta kiln-fired clay bricks arranged in dynamic architectural layers under dramatic golden-hour sunlight.
- BACKGROUND: Clean modern construction site with architectural crane silhouette in the soft-focus distance under clear blue sky.
- HEADLINE: Massive, commanding bold typography: "GÜVENLİ YAPILARIN SARSILMAZ TEMELİ!".
- ACTION CARDS:
  - "[ 🚛 Tır Bazlı Şantiye Teslimi ]"
  - "[ Fabrikadan Doğrudan Tedarik ]"
- PRIMARY CTA: High-contrast vibrant terracotta-red button: "HEMEN TEKLİF İSTEYİN →".
- MOOD: Monumental industrial strength, commercial launch energy, zero cheap neon.`,
    negativePrompt: 'laptop, computer screens, neon glow, green laser lines, broken bricks, dark dingy cellar'
  },

  // 11. AYVAZOĞLU İNŞAAT — GERÇEK KULLANIM
  {
    fileName: '11_ayvazoglu_gercek_kullanim.png',
    title: 'Ayvazoğlu İnşaat — Gerçek Kullanım (Şantiye Şefi & Tuğla Kontrolü)',
    brand: 'Ayvazoğlu İnşaat',
    style: 'REAL_LIFE_CAMPAIGN',
    prompt: `An authentic, trustworthy commercial photograph for Ayvazoğlu İnşaat.
Format: 1:1 square. Turkish audience.
HUMAN & STORY-FIRST:
- SCENE: An experienced Turkish civil engineer / site supervisor wearing a white safety hardhat and high-visibility vest at an active modern building construction site in bright natural daylight.
- ACTION: He is standing beside a newly built wall of crisp terracotta clay bricks, inspecting the precision quality with a satisfied, confident smile.
- AD OVERLAY: Ayvazoğlu İnşaat emblem, clear headline: "Şantiyeniz İçin Güvenilir ve Hızlı Tedarik", prominent CTA button: "Toptan Satış ile İletişime Geçin →".
- MOOD: Professional integrity, safety, authentic construction reality.`,
    negativePrompt: 'office desk, laptop, computer screen, deformed hands, cartoon, dangerous unsafe workers'
  },

  // 12. AYVAZOĞLU İNŞAAT — PREMIUM VİTRİN
  {
    fileName: '12_ayvazoglu_premium_vitrin.png',
    title: 'Ayvazoğlu İnşaat — Premium Vitrin (Mimari Heykelsi Tuğla & Doğal Gölge)',
    brand: 'Ayvazoğlu İnşaat',
    style: 'PREMIUM_SHOWCASE',
    prompt: `An ultra-luxurious, minimalist architectural commercial showcase for Ayvazoğlu İnşaat.
Format: 1:1 square. Turkish audience.
ARCHITECTURAL MINIMALISM & QUIET LUXURY:
- ENVIRONMENT: High-end architectural studio daylight. A smooth cast concrete plinth or raw limestone slab.
- PRESENTATION: A single, geometrically pristine warm terracotta kiln-fired clay brick showcased like an architectural art piece on the pedestal.
- LIGHTING: Exquisite natural afternoon architectural sunlight casting long diagonal geometric shadows across the textured concrete.
- TYPOGRAPHY: Elegant Swiss editorial typography: "Mimaride Zamansız Dayanıklılık", refined minimalist outline CTA: "Ürün Kataloğunu İnceleyin →".
- MOOD: Executive prestige, architectural elegance, zero clutter.`,
    negativePrompt: 'laptop, computers, messy building rubble, neon, cartoon, plastic textures, clutter'
  }
]

async function main() {
  console.log('========================================================================')
  console.log('🚀 3 MARKA (AYVAZ, BOFE, MESAJIFY) × 4 STİL = 12 VARYASYON ÜRETİMİ')
  console.log('========================================================================\n')

  // Step 1: Copy existing 5 verified assets to staging
  console.log('--- ADIM 1: Mevcut 5 doğrulanmış görsel aktarılıyor ---')
  for (const [targetName, srcPath] of Object.entries(EXISTING_MAP)) {
    const dest = path.join(stagingDir, targetName)
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, dest)
      console.log(`✅ Kopyalandı: ${targetName}`)
    } else {
      console.warn(`⚠️ Kaynak bulunamadı: ${srcPath}`)
    }
  }

  // Step 2: Generate remaining 7 images
  console.log('\n--- ADIM 2: Kalan 7 yeni varyasyon Gateway üzerinden üretiliyor ---')
  for (const job of NEW_JOBS) {
    console.log(`\n------------------------------------------------------`)
    console.log(`[ÜRETİLİYOR] ${job.title} -> ${job.fileName}`)
    console.log(`------------------------------------------------------`)

    const payload: any = {
      prompt: job.prompt,
      size: '1024x1024',
      response_format: 'url'
    }
    if (job.refs && job.refs.length > 0) {
      payload.referenceImages = job.refs
    }

    const res = await fetch('http://167.233.201.31:3456/v1/images/generations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })

    const json = await res.json()
    console.log('Gateway status:', res.status, json.job_id || json.id || '')

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
      console.error(`Görsel URL alınamadı: ${job.fileName}`)
      continue
    }

    console.log(`Downloading: ${imgUrl}...`)
    const imgRes = await fetch(imgUrl, {
      headers: { 'authorization': `Bearer ${token}` }
    })
    const buf = Buffer.from(await imgRes.arrayBuffer())

    const dest = path.join(stagingDir, job.fileName)
    fs.writeFileSync(dest, buf)
    console.log(`Saved: ${dest} (${(buf.length / 1024).toFixed(1)} KB)`)
  }

  console.log('\n========================================================================')
  console.log('🎉 12 VARYASYONUN TAMAMI HAZIRLANDI!')
  console.log('========================================================================')
}

main().catch(console.error)
