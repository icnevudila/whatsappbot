/**
 * Landing screenshot sanitizer — kişisel numara/mesaj/org adını kampanya demo ile kapatır.
 * Çalıştır: node --import tsx scripts/sanitize-landing-shots.mjs
 * (veya: node scripts/sanitize-landing-shots.mjs)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '../public/landing')

/** @typedef {{ x: number, y: number, w: number, h: number, fill?: string, text?: string, textX?: number, textY?: number, size?: number, color?: string, weight?: string }} Overlay */

/**
 * @param {number} width
 * @param {number} height
 * @param {Overlay[]} overlays
 */
function svgOverlay(width, height, overlays) {
  const parts = overlays.map((o) => {
    const x = Math.round(o.x * width)
    const y = Math.round(o.y * height)
    const w = Math.round(o.w * width)
    const h = Math.round(o.h * height)
    const fill = o.fill ?? '#ffffff'
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`
    if (o.text) {
      const tx = Math.round((o.textX ?? o.x + 0.008) * width)
      const ty = Math.round((o.textY ?? o.y + o.h * 0.62) * height)
      const size = o.size ?? Math.max(11, Math.round(height * 0.011))
      const color = o.color ?? '#1c2434'
      const weight = o.weight ?? '600'
      const escaped = o.text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
      s += `<text x="${tx}" y="${ty}" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="${size}" font-weight="${weight}" fill="${color}">${escaped}</text>`
    }
    return s
  })
  return Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`,
  )
}

/** Ortak: org adı + e-posta + topbar */
/** @returns {Overlay[]} */
function chromeMasks() {
  return [
    // Sidebar işletme adı
    { x: 0.02, y: 0.055, w: 0.11, h: 0.028, text: 'Demo İşletme', size: 12 },
    // Topbar sol org
    { x: 0.145, y: 0.012, w: 0.12, h: 0.028, text: 'Demo İşletme', size: 12 },
    // Sidebar email
    { x: 0.015, y: 0.955, w: 0.12, h: 0.025, text: 'demo@filo.dev', size: 10, color: '#94a3b8', weight: '500' },
  ]
}

/** @type {Record<string, { src: string, out: string, overlays: (w: number, h: number) => Overlay[] }>} */
const jobs = {
  ozet: {
    src: 'shot-1.png',
    out: 'ozet.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.15, y: 0.72, w: 0.28, h: 0.12, fill: '#ffffff' },
      { x: 0.16, y: 0.74, w: 0.2, h: 0.025, text: 'Satış hattı · 184 / 250', size: 12 },
      { x: 0.16, y: 0.78, w: 0.2, h: 0.025, text: 'Destek hattı · 96 / 250', size: 12 },
      { x: 0.16, y: 0.82, w: 0.22, h: 0.025, text: 'Kampanya yedek · QR bekliyor', size: 12 },
      { x: 0.48, y: 0.78, w: 0.22, h: 0.08, fill: '#ffffff' },
      { x: 0.49, y: 0.8, w: 0.2, h: 0.025, text: 'Bahar kampanyası', size: 12 },
      { x: 0.49, y: 0.835, w: 0.2, h: 0.025, text: 'Randevu hatırlatma', size: 12 },
    ],
  },
  hesaplar: {
    src: 'shot-2.png',
    out: 'hesaplar.png',
    overlays: () => [
      ...chromeMasks(),
      // Tüm hat listesini kapat — kişisel isim/numara kalmasın
      { x: 0.14, y: 0.24, w: 0.84, h: 0.72, fill: '#f4f5f7' },
      { x: 0.15, y: 0.26, w: 0.82, h: 0.2, fill: '#ffffff' },
      { x: 0.17, y: 0.29, w: 0.4, h: 0.03, text: 'Satış hattı', size: 15 },
      { x: 0.17, y: 0.325, w: 0.5, h: 0.025, text: '+90 532 ··· ·· 01', size: 13, color: '#64748b', weight: '500' },
      { x: 0.72, y: 0.3, w: 0.12, h: 0.03, text: 'Bağlı', size: 13, color: '#16a34a', weight: '700' },
      { x: 0.17, y: 0.38, w: 0.55, h: 0.025, text: 'Bugün 184 / 250  ·  kampanyaya hazır', size: 12, color: '#64748b', weight: '500' },

      { x: 0.15, y: 0.48, w: 0.82, h: 0.2, fill: '#ffffff' },
      { x: 0.17, y: 0.51, w: 0.4, h: 0.03, text: 'Destek hattı', size: 15 },
      { x: 0.17, y: 0.545, w: 0.5, h: 0.025, text: '+90 532 ··· ·· 02', size: 13, color: '#64748b', weight: '500' },
      { x: 0.68, y: 0.52, w: 0.18, h: 0.03, text: 'Çıkış yapıldı', size: 12, color: '#64748b', weight: '600' },
      { x: 0.17, y: 0.6, w: 0.5, h: 0.025, text: 'Yeniden bağlamak için QR okutun', size: 12, color: '#64748b', weight: '500' },

      { x: 0.15, y: 0.7, w: 0.82, h: 0.2, fill: '#ffffff' },
      { x: 0.17, y: 0.73, w: 0.4, h: 0.03, text: 'Kampanya yedek', size: 15 },
      { x: 0.17, y: 0.765, w: 0.5, h: 0.025, text: 'Numara bekleniyor', size: 13, color: '#64748b', weight: '500' },
      { x: 0.72, y: 0.74, w: 0.12, h: 0.03, text: 'Kapalı', size: 13, color: '#94a3b8', weight: '600' },
      { x: 0.17, y: 0.82, w: 0.5, h: 0.025, text: 'QR okutulmadı — hat eklenince gelir', size: 12, color: '#64748b', weight: '500' },
    ],
  },
  hizli: {
    src: 'shot-3.png',
    out: 'hizli-gonderim.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.15, y: 0.52, w: 0.45, h: 0.12, fill: '#ffffff' },
      { x: 0.17, y: 0.55, w: 0.4, h: 0.025, text: '☑  Satış hattı', size: 13 },
      { x: 0.17, y: 0.585, w: 0.4, h: 0.022, text: '+90 532 ··· ·· 01  ·  bugün 184 / 250 hak', size: 12, color: '#64748b', weight: '500' },
    ],
  },
  kisiler: {
    src: 'shot-4.png',
    out: 'kisiler.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.16, y: 0.22, w: 0.35, h: 0.05, fill: '#ffffff' },
      { x: 0.17, y: 0.235, w: 0.3, h: 0.025, text: 'Bahar 2026 · İstanbul', size: 13 },
    ],
  },
  karaListe: {
    src: 'shot-5.png',
    out: 'kara-liste.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.16, y: 0.28, w: 0.35, h: 0.06, fill: '#ffffff' },
      { x: 0.17, y: 0.295, w: 0.28, h: 0.022, text: '+90 544 ··· ·· 51', size: 13 },
      { x: 0.17, y: 0.32, w: 0.3, h: 0.02, text: 'Çıkmak istedi · kampanya STOP', size: 11, color: '#64748b', weight: '500' },
    ],
  },
  durum: {
    src: 'shot-6.png',
    out: 'durum.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.15, y: 0.55, w: 0.38, h: 0.18, fill: '#ffffff' },
      { x: 0.17, y: 0.58, w: 0.34, h: 0.025, text: 'Satış hattı  ·  +90 532 ··· ·· 01  ·  Bağlı', size: 12 },
      { x: 0.17, y: 0.62, w: 0.34, h: 0.025, text: 'Destek hattı  ·  +90 532 ··· ·· 02  ·  Bağlı', size: 12 },
      { x: 0.17, y: 0.66, w: 0.34, h: 0.025, text: 'Kampanya yedek  ·  QR bekleniyor', size: 12 },
      { x: 0.54, y: 0.55, w: 0.4, h: 0.18, fill: '#ffffff' },
      { x: 0.56, y: 0.58, w: 0.35, h: 0.025, text: 'Bahar kampanyası  ·  Tamamlandı', size: 12 },
      { x: 0.56, y: 0.62, w: 0.35, h: 0.025, text: 'Randevu hatırlatma  ·  Çalışıyor', size: 12 },
      { x: 0.56, y: 0.66, w: 0.35, h: 0.025, text: 'Yeni müşteri karşılama  ·  Taslak', size: 12 },
      // canlı olay — isimleri kapat
      { x: 0.15, y: 0.78, w: 0.78, h: 0.16, fill: '#ffffff' },
      { x: 0.17, y: 0.81, w: 0.5, h: 0.022, text: 'Satış hattı bağlandı · 08:37', size: 12, color: '#64748b', weight: '500' },
      { x: 0.17, y: 0.85, w: 0.55, h: 0.022, text: 'Bahar kampanyası tamamlandı · 09:12', size: 12, color: '#64748b', weight: '500' },
      { x: 0.17, y: 0.89, w: 0.55, h: 0.022, text: 'Destek hattı kota yenilendi · 10:01', size: 12, color: '#64748b', weight: '500' },
    ],
  },
  raporlar: {
    src: 'shot-7.png',
    out: 'raporlar.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.16, y: 0.55, w: 0.35, h: 0.12, fill: '#ffffff' },
      { x: 0.17, y: 0.57, w: 0.3, h: 0.022, text: 'Bahar kampanyası · 1.840 giden', size: 12 },
      { x: 0.17, y: 0.605, w: 0.3, h: 0.022, text: 'Randevu hatırlatma · 420 giden', size: 12 },
      { x: 0.17, y: 0.64, w: 0.3, h: 0.022, text: 'Karşılama · 210 giden', size: 12 },
      { x: 0.55, y: 0.55, w: 0.3, h: 0.1, fill: '#ffffff' },
      { x: 0.56, y: 0.57, w: 0.25, h: 0.022, text: 'Satış hattı · 1.120', size: 12 },
      { x: 0.56, y: 0.605, w: 0.25, h: 0.022, text: 'Destek hattı · 640', size: 12 },
    ],
  },
  gelenler: {
    src: 'gelenler-raw.png',
    out: 'gelenler.png',
    overlays: (_w, h) => {
      // Uzun sayfa — oranlar yüksekliğe göre
      const isTall = h > 2000
      return [
        ...chromeMasks().map((o) =>
          isTall
            ? { ...o, y: o.y * 0.35, h: Math.min(o.h, 0.012) }
            : o,
        ),
        // sohbet listesi numaraları + önizleme
        { x: 0.145, y: isTall ? 0.18 : 0.22, w: 0.28, h: isTall ? 0.12 : 0.28, fill: '#ffffff' },
        { x: 0.155, y: isTall ? 0.19 : 0.24, w: 0.24, h: 0.018, text: '+90 532 ··· ·· 14', size: 12 },
        { x: 0.155, y: isTall ? 0.205 : 0.265, w: 0.25, h: 0.016, text: 'İlgileniyorum, randevu alabilir miyim?', size: 11, color: '#64748b', weight: '500' },
        { x: 0.155, y: isTall ? 0.23 : 0.3, w: 0.24, h: 0.018, text: '+90 533 ··· ·· 28', size: 12 },
        { x: 0.155, y: isTall ? 0.245 : 0.325, w: 0.25, h: 0.016, text: 'Fiyat listesini paylaşır mısınız?', size: 11, color: '#64748b', weight: '500' },
        { x: 0.155, y: isTall ? 0.27 : 0.36, w: 0.24, h: 0.018, text: '+90 544 ··· ·· 51', size: 12 },
        { x: 0.155, y: isTall ? 0.285 : 0.385, w: 0.25, h: 0.016, text: 'Kampanyadan çıkmak istiyorum', size: 11, color: '#64748b', weight: '500' },
        // thread alanı
        { x: 0.45, y: isTall ? 0.18 : 0.2, w: 0.5, h: isTall ? 0.35 : 0.55, fill: '#f7f8fb' },
        { x: 0.46, y: isTall ? 0.19 : 0.22, w: 0.3, h: 0.02, text: '+90 532 ··· ·· 14', size: 13 },
        { x: 0.46, y: isTall ? 0.21 : 0.25, w: 0.4, h: 0.018, text: 'Bahar kampanyası · yanıt', size: 11, color: '#64748b', weight: '500' },
        { x: 0.52, y: isTall ? 0.25 : 0.32, w: 0.4, h: 0.06, fill: '#2f5bff', text: '', size: 11 },
        { x: 0.53, y: isTall ? 0.27 : 0.345, w: 0.38, h: 0.04, text: 'Merhaba, bahar paketimizde %20 indirim…', size: 11, color: '#ffffff', weight: '500' },
        { x: 0.46, y: isTall ? 0.33 : 0.42, w: 0.35, h: 0.05, fill: '#eef1f6' },
        { x: 0.47, y: isTall ? 0.35 : 0.445, w: 0.32, h: 0.03, text: 'İlgileniyorum, randevu alabilir miyim?', size: 11, color: '#1c2434', weight: '500' },
      ]
    },
  },
  gidenler: {
    src: 'gidenler-raw.png',
    out: 'gidenler.png',
    overlays: () => [
      ...chromeMasks(),
      // sol liste tamamen kapla demo satırlarla
      { x: 0.145, y: 0.2, w: 0.38, h: 0.72, fill: '#ffffff' },
      { x: 0.155, y: 0.22, w: 0.2, h: 0.02, text: 'Giden mesajlar', size: 12, color: '#64748b', weight: '600' },
      ...[
        ['+90 532 ··· ·· 14', 'Bahar kampanyası · Merhaba Ayşe…', 'Okundu', 0.26],
        ['+90 533 ··· ·· 28', 'Bahar kampanyası · Merhaba Mehmet…', 'Okundu', 0.38],
        ['+90 544 ··· ·· 51', 'Randevu hatırlatma · yarın 14:00', 'Teslim', 0.5],
        ['+90 555 ··· ·· 03', 'Karşılama · hoş geldiniz', 'Okundu', 0.62],
        ['+90 505 ··· ·· 77', 'Bahar kampanyası · paket detayı', 'Okundu', 0.74],
      ].flatMap(([phone, body, status, y]) => [
        { x: 0.155, y, w: 0.35, h: 0.1, fill: '#ffffff' },
        { x: 0.16, y: y + 0.01, w: 0.25, h: 0.02, text: phone, size: 12 },
        { x: 0.16, y: y + 0.035, w: 0.34, h: 0.025, text: body, size: 11, color: '#64748b', weight: '500' },
        { x: 0.16, y: y + 0.065, w: 0.12, h: 0.02, text: status, size: 10, color: '#2f5bff', weight: '600' },
      ]),
      { x: 0.55, y: 0.35, w: 0.38, h: 0.2, fill: '#ffffff' },
      { x: 0.57, y: 0.4, w: 0.3, h: 0.025, text: 'Bir kayıt seçin', size: 14, color: '#64748b', weight: '600' },
      { x: 0.57, y: 0.44, w: 0.32, h: 0.04, text: 'Soldan kampanya mesajına tıklayın', size: 12, color: '#94a3b8', weight: '500' },
    ],
  },
}

async function run() {
  for (const [key, job] of Object.entries(jobs)) {
    const srcPath = path.join(root, job.src)
    const outPath = path.join(root, job.out)
    if (!fs.existsSync(srcPath)) {
      console.warn('skip missing', key, job.src)
      continue
    }
    const base = sharp(srcPath)
    const meta = await base.metadata()
    const width = meta.width ?? 1800
    const height = meta.height ?? 1200
    const overlays = job.overlays(width, height)
    const svg = svgOverlay(width, height, overlays)
    await sharp(srcPath)
      .composite([{ input: svg, top: 0, left: 0 }])
      .png({ quality: 90 })
      .toFile(outPath)
    console.log('ok', key, '->', job.out)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
