const GATEWAY_URL = process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456'

const LOGO_URL = 'http://167.233.201.31:3456/outputs/mesajify_logo.png'
const PRODUCT_IMAGE_URL = 'http://167.233.201.31:3456/outputs/mesajify_logo.png'

async function generateVeoVideo() {
  console.log('========================================================')
  console.log('🎬 MESAJIFY GOOGLE FLOW VEO 3.1 VIDEO ÜRETİM MOTORU')
  console.log(`   Gateway: ${GATEWAY_URL}`)
  console.log(`   Logo URL: ${LOGO_URL}`)
  console.log('========================================================')

  const veoPrompt = `Cinematic 8-second commercial presentation for Mesajify. 
Starts with a sleek minimalist workspace on light sage podium (#EFF4EE). 
A luxury smartphone mockup displays an incoming WhatsApp message with green checkmarks. 
The official emerald green Mesajify logo (#00A884) appears in the top corner. 
Smooth camera glide showing customer reply bubbles arriving into a unified shared dashboard. 
Clean Swiss aesthetic, soft natural lighting, high dynamic range, crisp typography, 4K commercial quality.`

  const voiceoverText = 'Civarınızdaki işletmelere ürünlerinizi doğrudan tanıtın. WhatsApp ile reklamınızı yapın, müşteri yanıtlarını tek ekrandan satışa dönüştürün.'

  const payload = {
    orgId: '2881f690-6853-4064-8768-307463ae6255',
    brandName: 'Mesajify',
    productName: 'Mesajify Doğrudan Tanıtım ve Müşteri Bulucu',
    customer: 'Mesajify Marka Yönetimi',
    prompt: veoPrompt,
    voiceoverText: voiceoverText,
    logoUrl: LOGO_URL,
    productImageUrl: PRODUCT_IMAGE_URL,
    primaryColor: '#00A884',
    accentColor: '#168347',
    preferredEngine: 'flow',
    engine: 'flow',
    useFlow: true,
    includeLogo: true,
    includeOverlay: false,
  }

  console.log('\n⏳ [Flow Dispatch] Google Flow Veo motoruna gönderiliyor...')
  const startTime = Date.now()

  try {
    const res = await fetch(`${GATEWAY_URL}/v1/videos/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    console.log(`HTTP Yanıt Kodu: ${res.status}`)
    const text = await res.text()
    console.log(`Yanıt: ${text.slice(0, 500)}`)

    if (!res.ok) {
      console.error('❌ Video üretim isteği başarısız oldu.')
      return
    }

    const data = JSON.parse(text)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\n🎉 [BAŞARILI] Video üretildi (${elapsed}s)!`)
    console.log(`🎬 Video URL: ${data.videoUrl || data.subtitledVideoUrl || data.cleanVideoUrl}`)
  } catch (err) {
    console.error('❌ İstek hatası:', err.message)
  }
}

generateVeoVideo()
