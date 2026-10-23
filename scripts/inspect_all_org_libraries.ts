import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3003'

const ORGS = [
  { name: 'Ayvazoğlu İnşaat', id: '4a58b0dd-0931-4901-880a-686457d15010' },
  { name: 'Mesajify', id: '2881f690-6853-4064-8768-307463ae6255' },
  { name: 'Bofe Tarım', id: 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0' },
  { name: 'Bofe', id: 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc' },
  { name: 'Veri Burada', id: 'c9b24e55-6d07-48ef-b4e4-e0cb1678ded5' },
  { name: 'Maydonoz Döner', id: 'a2e4cc0c-7a82-47f1-a618-0baebf6b67a3' }
]

async function inspectLibraries() {
  console.log('========================================================================')
  console.log('🔍 MESAJIFY TÜM ORGANİZASYONLAR VE VARYASYONLAR KÜTÜPHANE YANSIMA DENETİMİ')
  console.log('========================================================================\n')

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  })

  const context = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    locale: 'tr-TR'
  })

  const page = await context.newPage()

  // Login
  await page.goto(`${BASE_URL}/giris`, { waitUntil: 'networkidle' })
  await page.fill('input[name="email"]', 'test@filo.dev')
  await page.fill('input[name="password"]', 'TestPass123!')
  await Promise.all([
    page.waitForURL('**/ozet', { timeout: 20000 }).catch(() => null),
    page.click('button[type="submit"]')
  ])
  console.log('✓ Giriş yapıldı.\n')

  const overallResults: Record<string, any> = {}

  for (const org of ORGS) {
    console.log(`------------------------------------------------------------------------`)
    console.log(`🏢 ORGANİZASYON: ${org.name} (${org.id})`)
    console.log(`------------------------------------------------------------------------`)

    await context.addCookies([{
      name: 'wb_active_org',
      value: org.id,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }])

    await page.goto(`${BASE_URL}/icerik`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const cards = page.locator('article.group')
    const count = await cards.count()
    console.log(`  Toplam Kütüphane Kartı Sayısı: ${count}`)

    const cardDetails = []
    let videosCount = 0
    let imagesCount = 0

    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      const text = (await card.innerText()).replace(/\r?\n/g, ' | ')
      const href = await card.locator('a[href*="/icerik/"]').first().getAttribute('href').catch(() => null)
      const hasImg = (await card.locator('img').count()) > 0
      const imgSrc = hasImg ? await card.locator('img').first().getAttribute('src').catch(() => null) : null
      const isVideo = text.includes('0:') || text.includes('1:') || text.includes('Video') || text.includes('Reklam')

      if (isVideo) videosCount++
      else imagesCount++

      cardDetails.push({ index: i + 1, href, isVideo, text, imgSrc })
      console.log(`  [Kart #${i + 1}] Tip: ${isVideo ? '🎬 VIDEO' : '🖼️ GÖRSEL'} | Link: ${href} | İçerik: "${text}"`)
    }

    overallResults[org.name] = {
      total: count,
      videos: videosCount,
      images: imagesCount,
      cards: cardDetails
    }
    console.log(`  -> Özet: ${videosCount} video, ${imagesCount} görsel kartı listeleniyor.\n`)
  }

  await browser.close()

  console.log('========================================================================')
  console.log('📊 GENEL DENETİM SONUCU:')
  for (const [name, res] of Object.entries(overallResults)) {
    console.log(` - ${name}: Toplam ${res.total} içerik (${res.videos} video, ${res.images} görsel)`)
  }
  console.log('========================================================================')
}

inspectLibraries().catch(console.error)
