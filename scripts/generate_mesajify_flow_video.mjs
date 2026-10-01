import { compileDeterministicV5 } from '../apps/customer/src/lib/creative/v5/index.ts'

async function main() {
  console.log('========================================================')
  console.log('🚀 MESAJIFY GOOGLE FLOW VEO 3.1 VIDEO ÜRETİM MOTORU')
  console.log('========================================================')

  const logoUrl = 'http://167.233.201.31:3456/outputs/mesajify_logo.png'
  const productImageUrl = 'http://167.233.201.31:3456/outputs/mesajify_logo.png'

  const v5Input = {
    brandName: 'Mesajify',
    brief: 'Civarınızdaki işletmelere ürünlerinizi doğrudan WhatsApp üzerinden tanıtın. Türkiye ve dünyada istediğiniz müşteri kitlesine ulaşın, gelen talepleri tek ekrandan satışa dönüştürün.',
    customVoiceover: 'Civarınızdaki işletmelere ürünlerinizi doğrudan tanıtın. WhatsApp ile reklamınızı yapın, müşteri yanıtlarını tek ekrandan satışa dönüştürün.',
    products: [{
      name: 'Mesajify Doğrudan Tanıtım ve Müşteri Bulucu',
      imageUrl: productImageUrl,
    }],
    productImageUrl: productImageUrl,
    logoUrl: logoUrl,
    brandKit: {
      name: 'Mesajify',
      logoUrl: logoUrl,
      colors: {
        primary: '#00A884',
        accent: '#168347',
        secondary: '#07100C',
      },
    },
    videoSpeech: true,
  }

  const payloadMeta = {
    orgId: '2881f690-6853-4064-8768-307463ae6255',
    brandName: 'Mesajify',
    productName: 'Mesajify Doğrudan Tanıtım ve Müşteri Bulucu',
    customer: 'Mesajify Marka Yönetimi',
    productImageUrl: productImageUrl,
    logoUrl: logoUrl,
    primaryColor: '#00A884',
    accentColor: '#168347',
  }

  // 1. Deterministik V5 Paketini Derle
  const v5Package = compileDeterministicV5(v5Input)
  console.log(`✅ [V5 Derleyici] Veo Prompt hazırlandı: ${v5Package.veoPrompt.slice(0, 100)}...`)
  console.log(`🎙️ [Seslendirme]: "${v5Package.voiceover.text}"`)

  // 2. Google Flow Veo Motoruna Gönder
  const gatewayUrl = 'http://167.233.201.31:3456'
  console.log(`\n⏳ [Flow Dispatch] Google Flow Veo 3.1 motoruna gönderiliyor (${gatewayUrl}/v1/videos/generations)...`)

  const reqBody = {
    ...payloadMeta,
    prompt: v5Package.veoPrompt,
    preferredEngine: 'flow',
    engine: 'flow',
    useFlow: true,
    includeLogo: true,
    includeOverlay: false,
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
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n🎉 [BAŞARILI] Mesajify videosu Flow tarafından üretildi (${elapsed}s)!`)
  console.log(`🎬 Altyazılı Video URL: ${data.subtitledVideoUrl || data.videoUrl}`)
  console.log(`✨ Temiz Video URL: ${data.cleanVideoUrl || 'N/A'}`)
  console.log(`🖼️ Thumbnail URL: ${data.thumbnailUrl}`)
}

main().catch((err) => {
  console.error('Fatal Error:', err)
  process.exit(1)
})
