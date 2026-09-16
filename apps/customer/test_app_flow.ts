import { generateImage } from './src/lib/ai/image'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('=== Kampanya Görseli Oluşturma Testi (App -> OmniStudio) ===')
  
  // Wizard tarafından derlenen gerçek prompt şablonu
  const prompt = [
    'Create ONE professional commercial campaign creative for WhatsApp / social ads.',
    'Turkish audience. High quality, sharp, mobile-first, no watermarks, no stock-photo logos.',
    'Use case: Square Post (1:1).',
    'Visual style: Modern, clean commercial design, contemporary type hierarchy, generous spacing.',
    'Product 1: name: sprey. price: 350 TL. offer: karta 6 taksit. extra: karta 6 taksit.',
    'Clean advertising product photography, professional studio lighting, commercial cosmetics/household spray aesthetic, 8k resolution.'
  ].join(' ')

  console.log('\nDerlenen Kampanya Promptu:\n', prompt)
  console.log('\ngenerateImage() çağrılıyor...')
  const start = Date.now()

  try {
    const { image, attempts } = await generateImage(prompt, '1:1')
    const elapsed = ((Date.now() - start) / 1000).toFixed(1)
    
    console.log(`\n🎉 BAŞARILI! Üretim Süresi: ${elapsed} saniye`)
    console.log(`Sağlayıcı (Provider): ${image.provider}`)
    console.log(`MIME Türü: ${image.mimeType}`)
    console.log(`Veri Boyutu: ${(image.data.length / 1024).toFixed(1)} KB`)
    if (attempts.length > 0) {
      console.log('Denemeler / Atlananlar:', attempts)
    }

    const outPath = path.resolve(__dirname, 'test_sprey_campaign.png')
    fs.writeFileSync(outPath, image.data)
    console.log(`Görsel yerel olarak kaydedildi: ${outPath}`)

    // Artifact dizinine de kopyalayalım
    const artifactPath = 'C:/Users/TP2/.gemini/antigravity/brain/30288fc9-f0b7-4bf2-9a4c-5ddc1f28b270/test_sprey_campaign.png'
    fs.writeFileSync(artifactPath, image.data)
    console.log(`Artifact dizinine kopyalandı: ${artifactPath}`)

  } catch (err: any) {
    console.error('\n❌ HATA OLUŞTU:', err.message)
  }
}

main()
