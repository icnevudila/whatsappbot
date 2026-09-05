import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'

const base = 'http://localhost:3100'
const output = new URL('../test-results/', import.meta.url)
await mkdir(output, { recursive: true })
// Önceki koşudan kalan empty fixture durumunu temizle
await fetch('http://127.0.0.1:54329/__fixture?empty=false', { method: 'POST' })
const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
const visit = async (path, heading) => {
  const response = await page.goto(base + path, { waitUntil: 'networkidle', timeout: 120000 })
  assert(response?.ok(), `${path}: HTTP ${response?.status()}`)
  if (heading) await page.getByRole('heading', { name: heading, exact: false }).first().waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${path}: horizontal overflow`)
  console.log(`PASS ${path}`)
}
try {
  await visit('/', 'Toplu WhatsApp kampanyası')
  await page.screenshot({ path: new URL('landing-desktop.png', output).pathname.replace(/^\//, ''), fullPage: true })
  await visit('/giris', 'Panele giriş')
  await page.screenshot({ path: new URL('login-desktop.png', output).pathname.replace(/^\//, ''), fullPage: true })
  // Yanlış şifre
  await page.locator('input[name="email"]').fill('test@filo.example')
  await page.locator('input[name="password"]').fill('wrong-password')
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click()
  await page.getByRole('alert').filter({ hasText: 'E-posta veya şifre hatalı' }).waitFor()
  // Doğru şifre — sayfayı yenileyip temiz formdan gir (action state takılmasın)
  await page.goto(base + '/giris', { waitUntil: 'networkidle', timeout: 120000 })
  await page.locator('input[name="email"]').fill('test@filo.example')
  await page.locator('input[name="password"]').fill('Filo-test-123!')
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/giris'), { timeout: 120000 }),
    page.getByRole('button', { name: 'Giriş yap', exact: true }).click(),
  ])
  console.log(`PASS login → ${page.url()}`)
  for (const path of ['/ozet', '/hesaplar', '/kisiler', '/kampanyalar', '/hizli-gonderim', '/gelenler', '/kara-liste', '/marka-kiti', '/ayarlar', '/kurulum', '/yardim', '/durum']) {
    await visit(path)
    await page.screenshot({ path: new URL(`${path.slice(1)}-desktop.png`, output).pathname.replace(/^\//, ''), fullPage: true })
  }
  await visit('/gelenler?tel=%2B905320000002')
  await page.getByLabel('Yanıtınız', { exact: true }).fill('Cumartesi 09.00–18.00 arasında açığız.')
  await page.getByRole('button', { name: 'Yanıtı gönder' }).click()
  await page.getByText('Yanıt WhatsApp’a gönderildi.', { exact: true }).waitFor({ timeout: 20000 })
  console.log('PASS reply queue flow (fixture backend; no real WhatsApp message)')
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ['/ozet', '/hesaplar', '/kisiler', '/kampanyalar', '/gelenler', '/gelenler?tel=%2B905320000002', '/ayarlar']) {
    await visit(path)
    await page.screenshot({ path: new URL(`${path.split('?')[0].slice(1)}${path.includes('?') ? '-thread' : ''}-mobile.png`, output).pathname.replace(/^\//, ''), fullPage: true })
  }
  await fetch('http://127.0.0.1:54329/__fixture?empty=true', { method: 'POST' })
  for (const path of ['/ozet', '/hesaplar', '/kisiler', '/kampanyalar', '/gelenler', '/kara-liste']) await visit(path)
  await page.context().clearCookies()
  await visit('/sifremi-unuttum', 'Şifrenizi yenileyelim')
  await page.getByLabel('E-posta adresi').fill('test@filo.example')
  await page.getByRole('button', { name: 'Yenileme bağlantısı gönder' }).click()
  await page.getByRole('status').filter({ hasText: 'Bu adresle bir hesabınız varsa' }).waitFor()
  await visit('/')
  await page.screenshot({ path: new URL('landing-mobile.png', output).pathname.replace(/^\//, ''), fullPage: true })
  assert.deepEqual(errors, [], 'Browser runtime errors')
  console.log('PASS all smoke checks')
} finally { await browser.close() }
