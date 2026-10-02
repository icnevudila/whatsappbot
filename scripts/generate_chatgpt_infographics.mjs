import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.resolve(__dirname, '..')

const GATEWAY_URL = process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456'

const LOGO_PATH = path.join(ROOT, 'apps/landing/public/brand/mesajify-official-logo.png')
const logoBase64 = fs.existsSync(LOGO_PATH) ? fs.readFileSync(LOGO_PATH).toString('base64') : null

const INFOGRAPHICS = [
  {
    id: 'ana-urun',
    filename: '01-ana-urun-chatgpt-16-9.png',
    aspect: '1792x1024',
    prompt: `Professional high-end SaaS product architecture diagram for 'Mesajify WhatsApp Kampanya Platformu'. 
Light minimalist background in soft sage white (#F7F9F8, #EFF4EE). 
In the center, an elegant modern clean SaaS control hub labeled 'MESAJIFY' with emerald green accents (#00A884). 
Four surrounding clean technical modular cards connected by sleek green circuit vector lines:
1. 'KREATIF' (Product photo to campaign creative)
2. 'KITLE' (Excel contact list upload and verified audience)
3. 'BAGLI HATLAR' (3 balanced WhatsApp business line nodes: Hat 01, Hat 02, Hat 03 with active green dots)
4. 'ORTAK GELEN KUTUSU' (Unified team inbox receiving customer replies)
Design style: Clean Swiss graphic design, Apple and Linear SaaS aesthetic, ultra-sharp 2D vector blueprint, crisp typography, no 3D distortion, perfectly readable labels, high-resolution UI diagram.`,
  },
  {
    id: 'kampanya-hazirlik',
    filename: '02-kampanya-hazirlik-chatgpt-16-9.png',
    aspect: '1792x1024',
    prompt: `Professional high-end SaaS web dashboard UI screenshot: 'Mesajify Kampanya ve Mesaj Hazırlığı' (WhatsApp Campaign Builder & Dynamic Message Template Studio).
Crisp light minimalist aesthetic on soft off-white background (#F8FAFC).
Top navigation bar has official Mesajify squircle logo with 'mesajify' text in dark slate, and step breadcrumbs: '1. Medya Seçimi  >  2. Şablon Metni  >  3. Kitle Seçimi'.
Dashboard shows 3 clean white cards side-by-side:
Card 1 (Left, 30% width): '1. Tanıtım Medyası'
- A sleek vertical 9:16 video preview frame showing a luxury burger / sneaker product showcase with play badge and filename 'kampanya_tanitim_9_16.mp4'.
- Format badge: 'WhatsApp 9:16 Video · HD'.
Card 2 (Middle, 40% width): '2. Kişiselleştirilmiş Şablon'
- Message composer with dynamic green tag pills: '{{Ad Soyad}}', '{{İndirim Kodu}}'.
- WhatsApp preview bubble: 'Merhaba {{Ad Soyad}}, Hafta sonuna özel seçili ürünlerde %30 indirim fırsatınız hazır! Detaylar için yanıtlayabilirsiniz.'
Card 3 (Right, 30% width): '3. Hedef Kitle'
- Audience selector showing 'Rehber / Müşteri Portföyü: 12.840 Doğrulanmış Numara'.
- Multi-line badge: '3 Bağlı WhatsApp Hattı ile Dengeli Gönderim'.
Bottom action bar:
- Large emerald green button: '▶ Kampanyayı Başlat' with green pulse indicator 'Hazır · Yük Dengeleme Aktif'.
Design style: Clean 2D vector SaaS UI, emerald green (#00A884) accents, sharp legible Turkish typography, Apple, Stripe and Linear aesthetic, high-resolution.`,
  },
  {
    id: 'guvenli-gonderim',
    filename: '03-guvenli-gonderim-chatgpt-16-9.png',
    aspect: '1792x1024',
    prompt: `Professional high-end SaaS web dashboard UI screenshot: 'Mesajify Akıllı ve Güvenli İletim' (Smart WhatsApp Campaign Dispatch & Safe Delivery Queue).
Crisp light minimalist aesthetic on soft off-white background (#F8FAFC).
Top navigation bar has official Mesajify squircle logo with 'mesajify' text in dark slate, and campaign status indicator: 'Kampanya Aktif · Gönderim Sürüyor'.
Dashboard is split into 2 main panels:
Left Panel (Campaign Progress & Delivery Safety, 45% width):
- Header: 'Canlı Gönderim Durumu'
- Large progress bar: '8.420 / 12.840 İletildi (%65)' with emerald green fill.
- 3 Stat KPI Cards in a row:
  1. 'İletildi: %99.4' with green double-check icon
  2. 'Okundu: %84.2' with double-check icon
  3. 'Gelen Yanıt: 142' with message bubble icon
- Delivery Pace & Spam Protection Box:
  * 'Doğal Gönderim Hızı: 4 sn / mesaj'
  * 'Akıllı Mola Algoritması: Aktif'
  * Small 'Duraklat' and 'Devam Et' control buttons
Right Panel (Live Delivery Stream, 55% width):
- Header: 'Son İletilen Mesajlar (Canlı Akış)'
- 4 Clean table / feed rows of recipients:
  1. '+90 532 891 ** **' · 'Ahmet Yılmaz' · '2 sn önce' · Green badge: '✓✓ İletildi'
  2. '+90 544 312 ** **' · 'Zeynep Kaya' · '6 sn önce' · Blue badge: '✓✓ Okundu'
  3. '+90 555 740 ** **' · 'Mehmet Demir' · '10 sn önce' · Emerald badge: '💬 Yanıt Geldi'
  4. '+90 533 118 ** **' · 'Canan Şahin' · '14 sn önce' · Green badge: '✓✓ İletildi'
Clean 2D vector UI, emerald green (#00A884) accents, sharp legible Turkish typography, Apple, Linear and Stripe SaaS style, high-resolution.`,
  },
  {
    id: 'studio-icon',
    filename: 'mesajify-studio-icon.png',
    aspect: '1024x1024',
    prompt: `An ultra-premium Apple iOS 3D glassmorphic app icon emblem for 'Mesajify AI Stüdyo'. 
The emblem is an elegant, polished emerald green (#00A884) rounded squircle with frosted glass bevels and subtle luminous neon edge reflections. 
In the center is the iconic Mesajify logo symbol (a friendly curved smiling chat loop aperture, glowing with bright emerald light). 
Floating subtly in front of a clean white studio background with soft ambient lighting, Apple Pro design aesthetic, photorealistic 3D render, octane render, 8K resolution, zero text.`,
  },
  {
    id: 'coklu-hat',
    filename: '03-coklu-hat-chatgpt-4-3.png',
    aspect: '1024x1024',
    prompt: `Professional SaaS architecture diagram for WhatsApp multi-line routing ('Çoklu Hat Yönetimi'). 
Light minimalist background in soft sage white (#F7F9F8). 
On the left: a clean card labeled 'TEK KAMPANYA' with campaign details badge.
In the center: 'MESAJIFY AKILLI DAĞITICI' with emerald green logo icon (#00A884).
Three balanced outgoing curved emerald green paths branching to the right:
- Card 1: 'Hat 01' with green active dot, 'Durum: Aktif', 'Yük: %34'
- Card 2: 'Hat 02' with green active dot, 'Durum: Aktif', 'Yük: %33'
- Card 3: 'Hat 03' with green active dot, 'Durum: Aktif', 'Yük: %33'
Bottom badge: 'Örnek Akış · Otomatik Yük Dengeleme'.
Ultra-clean 2D technical vector illustration, Swiss graphic design, Linear and Stripe SaaS aesthetic, perfectly legible Turkish typography, zero blur.`,
  },
  {
    id: 'ortak-inbox',
    filename: '04-ortak-inbox-chatgpt-16-9.png',
    aspect: '1792x1024',
    prompt: `Professional high-end SaaS web dashboard UI screenshot: 'Mesajify Ortak Gelen Kutusu' (Customer Sales & Support Inbox).
Crisp light minimalist aesthetic on soft off-white background (#F8FAFC).
Top navigation bar has official Mesajify squircle logo with 'mesajify' text in dark slate, and search bar.
Dashboard is split into 2 main panels:
Left Panel (Conversations List, 35% width):
- Header: 'Gelen Kutusu' with active count badge '18 Yeni Yanıt'.
- 4 Customer chat items:
  1. 'Ahmet Yılmaz' · 'Ürün fiyatını ve teslimat süresini öğrenebilir miyim?' (Yeşil rozet: 'Sipariş Talebi')
  2. 'Zeynep Kaya' · 'Kataloğunuzdaki 16L modeli için toptan fiyat var mı?' (Rozet: 'Toptan')
  3. 'Mehmet Demir' · 'Adresimize kargo gönderimi mevcut mu?'
  4. 'Selin Aydın' · 'Randevu oluşturmak istiyorum.'
Right Panel (Active Customer Conversation & Fast Reply, 65% width):
- Customer profile header: 'Ahmet Yılmaz · +90 532 123 45 67' with operator badge 'Temsilci: Caner (Aktif)'.
- WhatsApp message chat thread with neat green & white balloons showing the product ad inquiry.
- Bottom action bar: Fast Reply pills ('Fiyat Listesi Gönder', 'Katalog İlet', 'Satış Kapatıldı') and green 'Yanıtla' send button.
Clean 2D vector UI, emerald green (#00A884) accents, sharp legible Turkish typography, Apple and Stripe quality.`,
  },
  {
    id: 'kreatif-studyosu',
    filename: '05-kreatif-studyosu-chatgpt-4-3.png',
    aspect: '1024x1024',
    prompt: `Brand new distinct SaaS creation workflow diagram: 'Mesajify Kreatif Stüdyosu'. 
Do NOT generate a line routing diagram. 
Background: soft sage white (#EFF4EE). 
Layout is a 3-step studio production sequence from left to right:
Card 1 (Left): '1. Ham Ürün' - Showing a clean studio photo of an artisan bakery croissant or luxury perfume bottle, with a small color palette badge '#00A884'.
Card 2 (Middle): '2. AI Kreatif Motoru' - Clean rounded square card with glowing emerald green sparkle magic wand icon and status 'Şablon ve Metin Eşleştiriliyor...'.
Card 3 (Right): '3. Hazır Dikey Reklam' - A sleek 9:16 vertical smartphone Instagram/WhatsApp Story ad mockup with beautiful headline, product showcase, and 'Sipariş Ver' button.
Connecting lines: Emerald green arrows with step badges. 
Footnote: 'Saniyeler İçinde Kampanya Görseli'.
Crisp Swiss graphic design, clean modern typography, Apple quality.`,
  },
  {
    id: 'isletme-bulucu',
    filename: '06-isletme-bulucu-chatgpt-16-9.png',
    aspect: '1792x1024',
    prompt: `Brand new distinct B2B SaaS lead finder interface mockup: 'Mesajify İşletme Bulucu & Harita Taraması'. 
Do NOT generate a line routing diagram. 
Background: light minimalist warm grey (#F7F9F8).
Layout: A modern data discovery and lead generation dashboard:
- Header: 'İşletme Bulucu · Hedef Kitlenizi Keşfedin'
- Left Panel: 'Arama Filtreleri'
  * Dropdown: 'Sektör: Restoran & Kafe'
  * Dropdown: 'Konum: Kadıköy, İstanbul'
  * Active green toggle: 'Sadece Doğrulanmış WhatsApp Numaraları'
- Right Panel: 'Bulunan Doğrulanmış İşletmeler (1.420 İşletme)'
  * Clean spreadsheet / data table with columns: 'İşletme Adı', 'Kategori', 'Telefon', 'WhatsApp Durumu'
  * Row 1: 'Moda Butik Kafe' · '+90 532 ...' · Green badge 'Aktif'
  * Row 2: 'Kadıköy Kahvecisi' · '+90 544 ...' · Green badge 'Aktif'
  * Row 3: 'Deniz Fırını' · '+90 555 ...' · Green badge 'Aktif'
- Bottom Action Bar: Green button '▶ Kampanya Kitlesine Ekle (1.420 Kişi)'
Clean 2D vector UI, emerald green (#00A884) accents, crisp legible Turkish labels, Linear/Stripe SaaS style.`,
  },
]

async function generate(item) {
  console.log(`\n🚀 [ChatGPT Gateway] Üretim başlatılıyor: ${item.id} (${item.filename})`)
  const targetDir = path.join(ROOT, 'apps/landing/public/landing/infographics')
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }
  const targetFile = path.join(targetDir, item.filename)

  const payload = {
    model: 'dall-e-3',
    prompt: item.prompt,
    size: item.aspect === '1792x1024' ? '1792x1024' : '1024x1024',
    response_format: 'url',
    customer: 'Mesajify Marka Yönetimi',
    workspace: 'Mesajify Landing Asset Pipeline',
  }

  // Infographics use pure DALL-E prompt generation for clean crisp vector SaaS UI
  payload.referenceImages = []

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`   İstek gönderiliyor (Deneme ${attempt}/2)...`)
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 240000)

      const res = await fetch(`${GATEWAY_URL}/v1/images/generations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!res.ok) {
        const err = await res.text()
        console.error(`❌ Hata (${res.status}):`, err.slice(0, 300))
        if (attempt < 2) {
          console.log('   5 sn beklenip tekrar denenecek...')
          await new Promise(r => setTimeout(r, 5000))
          continue
        }
        return false
      }

      const data = await res.json()
      const url = data.data?.[0]?.url
      if (!url) {
        console.error('❌ URL bulunamadı:', data)
        return false
      }

      let downloadUrl = url.replace('localhost:3456', '167.233.201.31:3456').replace('127.0.0.1:3456', '167.233.201.31:3456')
      console.log(`   İndiriliyor: ${downloadUrl}`)
      const imgRes = await fetch(downloadUrl)
      const buf = Buffer.from(await imgRes.arrayBuffer())
      fs.writeFileSync(targetFile, buf)
      console.log(`✅ Kaydedildi: ${targetFile} (${buf.length} bytes)`)
      return true
    } catch (err) {
      console.error(`❌ Deneme ${attempt} hatası:`, err.message)
      if (attempt < 2) {
        console.log('   5 sn beklenip tekrar denenecek...')
        await new Promise(r => setTimeout(r, 5000))
      } else {
        return false
      }
    }
  }
  return false
}

async function main() {
  const arg = process.argv[2]
  const targetList = arg ? INFOGRAPHICS.filter(i => i.id === arg || i.filename.includes(arg)) : INFOGRAPHICS
  console.log(`Toplam ${targetList.length} adet görsel ChatGPT üzerinden üretilecek.`)
  for (const item of targetList) {
    await generate(item)
  }
  console.log('\n🎉 ChatGPT görsel üretimleri tamamlandı!')
}

main().catch(console.error)
