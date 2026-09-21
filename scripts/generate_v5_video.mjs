import { compileDeterministicV5 } from '../apps/customer/src/lib/creative/v5/index.ts'

const brandTarget = process.argv[2] || 'bofe'

async function main() {
  console.log(`🚀 [V5 Video Pipeline] ${brandTarget.toUpperCase()} için panel akışıyla üretim başlatılıyor...`)

  let v5Input
  let payloadMeta

  if (brandTarget.toLowerCase() === 'ayvazoglu' || brandTarget.toLowerCase() === 'ayvazoğlu') {
    const tuğlaUrl = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/4a58b0dd-0931-4901-880a-686457d15010/products/3c563c0e-2d46-47df-8898-e0c125455adf/1edbcbb3-53e6-42ea-95b0-1bf94ac243c3.webp'
    const logoUrl = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/4a58b0dd-0931-4901-880a-686457d15010/org-logo.jpg'
    v5Input = {
      brandName: 'Ayvazoğlu İnşaat',
      brief: 'Ayvazoğlu inşaat tuğla ve yapı malzemeleri reklam kampanyası',
      products: [{
        name: 'Tuğla',
        imageUrl: tuğlaUrl,
      }],
      productImageUrl: tuğlaUrl,
      logoUrl: logoUrl,
      brandKit: {
        name: 'Ayvazoğlu İnşaat',
        logoUrl: logoUrl,
      },
      videoSpeech: true,
    }
    payloadMeta = {
      orgId: '4a58b0dd-0931-4901-880a-686457d15010',
      brandName: 'Ayvazoğlu İnşaat',
      productName: 'Tuğla',
      customer: 'Ayvazoğlu İnşaat',
      productImageUrl: tuğlaUrl,
      logoUrl: logoUrl,
    }
  } else if (brandTarget.toLowerCase() === 'bofe') {
    const bofeProductImg = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/a2b33ee7-441c-444c-9b87-63f4cc37bf38.jpg'
    const bofeLogo = 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/brand-assets/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/org-logo.jpg'
    v5Input = {
      brandName: 'Bofe',
      brief: 'Bofe 16L şarjlı sırt pompası ile bahçe ve tarımda pratik ilaçlama',
      customVoiceover: 'Bofe 16L Şarjlı Sırt Pompası ile işlerinizi pratik şekilde tamamlayın.',
      products: [{
        name: 'Bofe 16L Şarjlı Sırt Pompası',
        imageUrl: bofeProductImg,
      }],
      productImageUrl: bofeProductImg,
      logoUrl: bofeLogo,
      brandKit: {
        name: 'Bofe',
        colors: {
          primary: '#000000',
          accent: '#acfe00',
          secondary: '#026009',
        },
      },
      videoSpeech: true,
    }
    payloadMeta = {
      orgId: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc',
      brandName: 'Bofe',
      productName: 'Bofe 16L Şarjlı Sırt Pompası',
      customer: 'Bofe',
      productImageUrl: bofeProductImg,
      logoUrl: bofeLogo,
      primaryColor: '#026009',
      accentColor: '#acfe00',
    }
  } else {
    // Veri Burada
    v5Input = {
      brandName: 'Veri Burada',
      brief: 'Google Haritalar işletme istihbaratı ve B2B müşteri tespit platformu',
      products: [{
        name: 'Harita Veri & B2B İstihbarat Platformu',
        imageUrl: 'http://167.233.201.31:3456/outputs/veriburada_logo.png',
      }],
      logoUrl: 'http://167.233.201.31:3456/outputs/veriburada_logo.png',
      brandKit: {
        name: 'Veri Burada',
        colors: {
          primary: '#1b5e20',
          accent: '#2e7d32',
          secondary: '#4caf50',
        },
      },
      videoSpeech: true,
    }
    payloadMeta = {
      orgId: 'c9b24e55-6d07-48ef-b4e4-e0cb1678ded5',
      brandName: 'Veri Burada',
      productName: 'Harita Veri & B2B İstihbarat Platformu',
      customer: 'Veri Burada',
      logoUrl: 'http://167.233.201.31:3456/outputs/veriburada_logo.png',
      primaryColor: '#1b5e20',
      accentColor: '#2e7d32',
    }
  }

  // 1. V5 Motoru ile Deterministik Derleme
  const v5Package = compileDeterministicV5(v5Input)
  console.log(`✅ [V5 Compiler] Prompt derlendi (${v5Package.veoPrompt.length} karakter).`)
  console.log(`🎙️ [Seslendirme]: "${v5Package.voiceover.text}" (${v5Package.voiceover.wordCount} kelime)`)
  console.log(`📹 [Kamera Modu]: ${v5Package.shotPlan.cameraMode}`)
  console.log(`🚫 [Negatif Kısıtlar]: ${v5Package.shotPlan.negativePrompt.slice(0, 80)}...`)

  // 2. Gateway API'ye gönder (Panelin çağırdığı POST /v1/videos/generations ile birebir aynı)
  const gatewayUrl = 'http://167.233.201.31:3456'
  console.log(`\n⏳ [Flow Dispatch] Google Flow Veo 3.1 motoruna gönderiliyor (${gatewayUrl}/v1/videos/generations)...`)

  const reqBody = {
    ...payloadMeta,
    prompt: v5Package.veoPrompt,
    preferredEngine: 'flow',
    engine: 'flow',
    useFlow: true,
    includeLogo: true,
    includeOverlay: false, // CTA bandı kapalı
    voiceoverText: v5Package.voiceover.text,
  }

  const startTime = Date.now()
  const response = await fetch(`${gatewayUrl}/v1/videos/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reqBody),
    signal: AbortSignal.timeout(300000), // 5 dakika
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error(`❌ [Hata HTTP ${response.status}]:`, errText)
    process.exit(1)
  }

  const data = await response.json()
  const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n🎉 [BAŞARILI] Video üretildi ve CapCut altyazısı işlendi (${elapsedSeconds}s)!`)
  console.log(`🎬 Video URL (Altyazılı): ${data.subtitledVideoUrl || data.videoUrl}`)
  console.log(`✨ Temiz Video URL (Altyazısız): ${data.cleanVideoUrl || 'N/A'}`)
  console.log(`🖼️ Thumbnail URL: ${data.thumbnailUrl}`)
  console.log(`🆔 Video ID: ${data.videoId}`)
}

main().catch((err) => {
  console.error('Fatal Error:', err)
  process.exit(1)
})
