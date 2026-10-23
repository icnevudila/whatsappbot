import { chromium } from 'playwright'

async function checkThumbnails() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } })
  const page = await context.newPage()

  await page.goto('http://localhost:3003/giris')
  await page.fill('input[name="email"]', 'test@filo.dev')
  await page.fill('input[name="password"]', 'TestPass123!')
  await Promise.all([
    page.waitForURL('**/ozet', { timeout: 20000 }).catch(() => null),
    page.click('button[type="submit"]')
  ])

  for (const orgId of ['4a58b0dd-0931-4901-880a-686457d15010', 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc']) {
    console.log(`\nChecking org: ${orgId}`)
    await context.addCookies([{
      name: 'wb_active_org',
      value: orgId,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }])

    await page.goto('http://localhost:3003/icerik', { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const cards = await page.locator('article.group').all()
    console.log(`Card count: ${cards.length}`)

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      const text = await card.innerText()
      const isVideo = text.includes('0:10') || text.includes('Video')
      const img = card.locator('img')
      const video = card.locator('video')

      const imgCount = await img.count()
      const videoCount = await video.count()

      if (imgCount > 0) {
        const src = await img.getAttribute('src')
        const natural = await img.evaluate((el: HTMLImageElement) => el.naturalWidth)
        console.log(`[Kart #${i + 1}] ${isVideo ? 'VIDEO' : 'GÖRSEL'}: <img> src=${src?.slice(0, 70)}... naturalWidth=${natural}`)
      } else if (videoCount > 0) {
        const src = await video.getAttribute('src')
        console.log(`[Kart #${i + 1}] ${isVideo ? 'VIDEO' : 'GÖRSEL'}: <video> src=${src?.slice(0, 70)}...`)
      }
    }
  }

  await browser.close()
}

checkThumbnails().catch(console.error)
