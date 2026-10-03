import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const GATEWAY_URL = process.env.OMNISTUDIO_GATEWAY_URL || 'https://media.167.233.201.31.nip.io'

// 1. Logo ve Referans Görsellerini Yükle
const LOGO_PATH = path.join(ROOT, 'apps/landing/public/logos/mesajify-logo.png')
const INBOX_PATH = path.join(ROOT, 'apps/landing/public/landing/gelenler.png')

function getBase64(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Referans dosya bulunamadı: ${filePath}`)
  }
  return fs.readFileSync(filePath).toString('base64')
}

const logoBase64 = getBase64(LOGO_PATH)
const inboxBase64 = fs.existsSync(INBOX_PATH) ? getBase64(INBOX_PATH) : null

// 2. Üretilecek Asset Tanımları
const ASSETS_TO_GENERATE = [
  {
    id: 'hero_fragrance_source',
    filename: 'hero-source-product.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'Luxury minimalist glass fragrance perfume bottle on polished light stone podium, clean studio lighting, soft reflections, high-end commercial product photography, no trademarks, ultra-sharp focus, 8k, Mesajify brand aesthetic with subtle emerald green highlights',
    aspect: '1:1',
    role: 'product',
  },
  {
    id: 'nova_headphones_creative',
    filename: 'nova-headphones-ad.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'Premium sleek matte black wireless over-ear headphones centered on dark obsidian surface, dramatic emerald rim lighting, studio product commercial presentation, luxury tech aesthetic, Apple and Sony quality, ultra-sharp details, 8k advertising',
    aspect: '9:16',
    role: 'product',
  },
  {
    id: 'bakery_croissant_creative',
    filename: 'bakery-croissant-ad.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'Artisan freshly baked golden croissants with delicate flaky crust on rustic wooden bakery table, rising warm steam, morning window sunlight, high-end gastronomy food commercial photography, mouth-watering gourmet aesthetic, 8k',
    aspect: '9:16',
    role: 'product',
  },
  {
    id: 'automotive_creative',
    filename: 'automotive-ad.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'Cinematic luxury modern electric sports car in futuristic dark minimalist showroom, sleek headlights glowing, on the front reception desk an elegant leather keychain with green Mesajify logo, high-end commercial car photography, 9:16 vertical format, 8k advertising aesthetic',
    aspect: '9:16',
    role: 'product',
  },
  {
    id: 'realestate_creative',
    filename: 'realestate-ad.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'Ultra-luxury modern minimalist architectural villa with infinity pool at golden hour, floor-to-ceiling glass windows, in front garden a sleek dark signpost with glowing green Mesajify logo and text Portföy, architectural photography, 9:16 vertical, 8k',
    aspect: '9:16',
    role: 'product',
  },
  {
    id: 'clinic_creative',
    filename: 'clinic-ad.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'High-end aesthetic dermatology and dental clinic lobby, marble reception desk, soft warm spa lighting, on the desk an iPad display showing green Mesajify appointment notification, luxury medical commercial, 9:16 vertical, 8k',
    aspect: '9:16',
    role: 'product',
  },
  {
    id: 'service_creative',
    filename: 'service-ad.png',
    folder: 'apps/landing/public/landing/studio',
    prompt: 'High-end corporate boutique advisory consulting office, sunlit Scandinavian desk setup, coffee cup, modern MacBook open on wooden desk displaying green Mesajify campaign dashboard, commercial business lifestyle photography, 9:16 vertical, 8k',
    aspect: '9:16',
    role: 'product',
  },
  {
    id: 'multi_line_routing_infographic',
    filename: 'multi-line-routing-infographic.png',
    folder: 'apps/landing/public/landing/infographics',
    prompt: 'Clean modern technical SaaS diagram on light background (#F7F9F8). At the top: 1 verified campaign batch. Flowing down through smooth curved lines into 3 balanced WhatsApp business phone nodes labeled HAT 01, HAT 02, HAT 03 with green checkmarks and active status badges. Linear and Resend aesthetic, emerald green (#22c55e) accents, no clutter, minimalist UI diagram, high precision',
    aspect: '16:9',
    role: 'infographic',
  },
  {
    id: 'unified_inbox_flow_infographic',
    filename: 'unified-inbox-flow-infographic.png',
    folder: 'apps/landing/public/landing/infographics',
    prompt: 'SaaS product conversion infographic on white background. Shows a WhatsApp chat bubble message transforming into a unified shared customer inbox interface with team assigned badges and instant response templates. Minimalist vector illustration, clean lines, green and slate palette, Mesajify product flow',
    aspect: '16:9',
    role: 'infographic',
  },
]

async function generateAsset(item) {
  console.log(`\n🎨 [ÜRETİM BAŞLADI] ${item.id} (${item.filename})`)
  console.log(`   Hedef Boyut: ${item.aspect} | Rol: ${item.role}`)

  const referenceImages = [
    {
      mimeType: 'image/png',
      data: logoBase64,
      role: 'logo',
    },
  ]

  if (item.role === 'infographic' && inboxBase64) {
    referenceImages.push({
      mimeType: 'image/png',
      data: inboxBase64,
      role: 'base',
    })
  }

  const payload = {
    prompt: item.prompt,
    size: item.aspect === '16:9' ? '1536x1024' : '1024x1024',
    response_format: 'url',
    referenceImages,
    workspace: 'Mesajify Landing Asset Pipeline',
    customer: 'Mesajify Marka Yönetimi',
  }

  const endpoint = `${GATEWAY_URL}/v1/images/generations`
  console.log(`   Bağlanılıyor: ${endpoint}`)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`   ❌ Hata (${res.status}): ${errText.slice(0, 300)}`)
      return false
    }

    const data = await res.json()
    const resultItem = data.data?.[0]
    if (!resultItem || (!resultItem.url && !resultItem.b64_json)) {
      console.error('   ❌ Yanıtta görsel verisi bulunamadı')
      return false
    }

    // Klasörü hazırla
    const targetDir = path.join(ROOT, item.folder)
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }
    const targetFile = path.join(targetDir, item.filename)

    if (resultItem.url) {
      let downloadUrl = resultItem.url
      downloadUrl = downloadUrl.replace('localhost:3456', '167.233.201.31:3456')
      downloadUrl = downloadUrl.replace('127.0.0.1:3456', '167.233.201.31:3456')
      console.log(`   İndiriliyor: ${downloadUrl}`)
      const imgRes = await fetch(downloadUrl)
      const buffer = Buffer.from(await imgRes.arrayBuffer())
      fs.writeFileSync(targetFile, buffer)
    } else {
      const buffer = Buffer.from(resultItem.b64_json, 'base64')
      fs.writeFileSync(targetFile, buffer)
    }

    console.log(`   ✅ BAŞARIYLA KAYDEDİLDİ: ${targetFile}`)
    return true
  } catch (err) {
    console.error(`   ❌ İstek hatası: ${err.message}`)
    return false
  }
}

async function main() {
  const targetId = process.argv[2]
  console.log('========================================================')
  console.log('🚀 MESAJIFY RESMİ MEDYA VE İNFOGRAFİK ÜRETİM MOTORU')
  console.log(`   Gateway: ${GATEWAY_URL}`)
  console.log(`   Referans Logo: ${LOGO_PATH}`)
  console.log('========================================================')

  const queue = targetId 
    ? ASSETS_TO_GENERATE.filter(a => a.id === targetId || a.filename.includes(targetId))
    : ASSETS_TO_GENERATE

  if (queue.length === 0) {
    console.log(`⚠️ Belirtilen kriterde görev bulunamadı: ${targetId}`)
    console.log('Mevcut görevler:', ASSETS_TO_GENERATE.map(a => a.id).join(', '))
    return
  }

  for (const item of queue) {
    await generateAsset(item)
  }

  console.log('\n✨ Tüm işlemler tamamlandı.')
}

main().catch(console.error)
