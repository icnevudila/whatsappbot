/**
 * Landing screenshot sanitizer — kişisel numara/mesaj/org adını kampanya demo ile kapatır.
 * Çalıştır: node apps/panel/scripts/sanitize-landing-shots.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '../public/landing')

/** @typedef {{ x: number, y: number, w: number, h: number, fill?: string, text?: string, textX?: number, textY?: number, size?: number, color?: string, weight?: string, rx?: number }} Overlay */

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
    const rx = o.rx ?? 4
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`
    if (o.text) {
      const tx = Math.round((o.textX ?? o.x + 0.008) * width)
      const ty = Math.round((o.textY ?? o.y + o.h * 0.65) * height)
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

/** @returns {Overlay[]} */
function chromeMasks() {
  return [
    { x: 0.018, y: 0.048, w: 0.12, h: 0.032, fill: '#f4f5f7', text: 'Demo İşletme', size: 12 },
    { x: 0.145, y: 0.01, w: 0.14, h: 0.032, fill: '#ffffff', text: 'Demo İşletme', size: 12 },
    { x: 0.012, y: 0.94, w: 0.13, h: 0.045, fill: '#f4f5f7', text: 'demo@filo.dev', size: 10, color: '#94a3b8', weight: '500' },
  ]
}

/** Ana içerik alanı (sidebar sağındaki panel) — tamamen kapat. */
function wipeMain(fill = '#f7f8fb') {
  return { x: 0.138, y: 0.055, w: 0.862, h: 0.945, fill, rx: 0 }
}

/** @returns {Overlay[]} */
function pageTitle(title, subtitle) {
  return [
    { x: 0.155, y: 0.07, w: 0.55, h: 0.035, fill: '#f7f8fb', text: title, size: 22, weight: '700' },
    {
      x: 0.155,
      y: 0.105,
      w: 0.55,
      h: 0.025,
      fill: '#f7f8fb',
      text: subtitle,
      size: 12,
      color: '#64748b',
      weight: '500',
    },
  ]
}

/** @returns {Overlay[]} */
function demoInboxOverlays() {
  const rows = [
    ['+90 532 ··· ·· 14', 'İlgileniyorum, randevu alabilir miyim?', '09:42'],
    ['+90 533 ··· ·· 28', 'Fiyat listesini paylaşır mısınız?', '09:18'],
    ['+90 544 ··· ·· 51', 'Kampanyadan çıkmak istiyorum', '08:55'],
    ['+90 555 ··· ·· 03', 'Teşekkürler, yarın görüşürüz.', 'Dün'],
  ]
  /** @type {Overlay[]} */
  const list = [
    wipeMain('#f7f8fb'),
    ...pageTitle('Gelenler', 'Kampanya yanıtları · demo veri — kişisel numara yok'),
    { x: 0.155, y: 0.145, w: 0.32, h: 0.78, fill: '#ffffff', rx: 10 },
    { x: 0.495, y: 0.145, w: 0.48, h: 0.78, fill: '#ffffff', rx: 10 },
    { x: 0.165, y: 0.16, w: 0.12, h: 0.028, fill: '#0c0e16', text: 'Tümü (4)', size: 11, color: '#ffffff', weight: '600' },
    { x: 0.3, y: 0.16, w: 0.12, h: 0.028, fill: '#f1f5f9', text: 'Yanıtlar', size: 11, color: '#64748b', weight: '500' },
  ]
  rows.forEach(([phone, preview, time], i) => {
    const y = 0.21 + i * 0.12
    const active = i === 0
    list.push(
      {
        x: 0.165,
        y,
        w: 0.3,
        h: 0.1,
        fill: active ? '#eef2ff' : '#ffffff',
        rx: 6,
      },
      { x: 0.175, y: y + 0.015, w: 0.2, h: 0.025, fill: active ? '#eef2ff' : '#ffffff', text: phone, size: 12 },
      {
        x: 0.38,
        y: y + 0.015,
        w: 0.07,
        h: 0.022,
        fill: active ? '#eef2ff' : '#ffffff',
        text: time,
        size: 10,
        color: '#94a3b8',
        weight: '500',
      },
      {
        x: 0.175,
        y: y + 0.045,
        w: 0.27,
        h: 0.035,
        fill: active ? '#eef2ff' : '#ffffff',
        text: preview,
        size: 11,
        color: '#64748b',
        weight: '500',
      },
    )
  })
  list.push(
    { x: 0.51, y: 0.16, w: 0.3, h: 0.03, fill: '#ffffff', text: '+90 532 ··· ·· 14', size: 14 },
    {
      x: 0.51,
      y: 0.19,
      w: 0.35,
      h: 0.022,
      fill: '#ffffff',
      text: 'Bahar kampanyası · yanıt',
      size: 11,
      color: '#64748b',
      weight: '500',
    },
    { x: 0.58, y: 0.28, w: 0.36, h: 0.09, fill: '#2f5bff', rx: 12 },
    {
      x: 0.595,
      y: 0.31,
      w: 0.33,
      h: 0.05,
      fill: '#2f5bff',
      text: 'Merhaba, bahar paketimizde %20 indirim…',
      size: 12,
      color: '#ffffff',
      weight: '500',
    },
    { x: 0.52, y: 0.42, w: 0.32, h: 0.08, fill: '#eef1f6', rx: 12 },
    {
      x: 0.535,
      y: 0.45,
      w: 0.29,
      h: 0.04,
      fill: '#eef1f6',
      text: 'İlgileniyorum, randevu alabilir miyim?',
      size: 12,
      color: '#1c2434',
      weight: '500',
    },
    { x: 0.58, y: 0.55, w: 0.36, h: 0.08, fill: '#2f5bff', rx: 12 },
    {
      x: 0.595,
      y: 0.575,
      w: 0.33,
      h: 0.04,
      fill: '#2f5bff',
      text: 'Harika — uygun günü yazmanız yeterli.',
      size: 12,
      color: '#ffffff',
      weight: '500',
    },
    { x: 0.51, y: 0.78, w: 0.35, h: 0.08, fill: '#f8fafc', rx: 8 },
    {
      x: 0.52,
      y: 0.81,
      w: 0.25,
      h: 0.03,
      fill: '#f8fafc',
      text: 'Mesajınızı yazın…',
      size: 12,
      color: '#94a3b8',
      weight: '500',
    },
    { x: 0.82, y: 0.79, w: 0.12, h: 0.06, fill: '#2f5bff', rx: 8, text: 'Yanıt gönder', size: 11, color: '#ffffff', weight: '600' },
  )
  return list
}

/** @returns {Overlay[]} */
function demoOutboxOverlays() {
  const rows = [
    ['+90 532 ··· ·· 14', 'Bahar kampanyası · Merhaba Ayşe…', 'Okundu'],
    ['+90 533 ··· ·· 28', 'Bahar kampanyası · Merhaba Mehmet…', 'Okundu'],
    ['+90 544 ··· ·· 51', 'Randevu hatırlatma · yarın 14:00', 'Teslim'],
    ['+90 555 ··· ·· 03', 'Karşılama · hoş geldiniz', 'Okundu'],
    ['+90 505 ··· ·· 77', 'Bahar kampanyası · paket detayı', 'Okundu'],
  ]
  /** @type {Overlay[]} */
  const list = [
    wipeMain('#f7f8fb'),
    ...pageTitle('Gidenler', 'Kampanya gönderimleri · demo veri — kişisel numara yok'),
    { x: 0.155, y: 0.15, w: 0.38, h: 0.78, fill: '#ffffff', rx: 10 },
    { x: 0.555, y: 0.15, w: 0.42, h: 0.78, fill: '#ffffff', rx: 10 },
    {
      x: 0.17,
      y: 0.17,
      w: 0.3,
      h: 0.025,
      fill: '#ffffff',
      text: 'Giden mesajlar · 5 kayıt',
      size: 12,
      color: '#64748b',
      weight: '600',
    },
  ]
  rows.forEach(([phone, body, status], i) => {
    const y = 0.22 + i * 0.12
    list.push(
      { x: 0.17, y, w: 0.35, h: 0.1, fill: '#ffffff', rx: 6 },
      { x: 0.18, y: y + 0.015, w: 0.25, h: 0.025, fill: '#ffffff', text: phone, size: 12 },
      {
        x: 0.18,
        y: y + 0.042,
        w: 0.32,
        h: 0.03,
        fill: '#ffffff',
        text: body,
        size: 11,
        color: '#64748b',
        weight: '500',
      },
      {
        x: 0.18,
        y: y + 0.07,
        w: 0.12,
        h: 0.02,
        fill: '#ffffff',
        text: status,
        size: 11,
        color: '#2f5bff',
        weight: '600',
      },
    )
  })
  list.push(
    {
      x: 0.6,
      y: 0.4,
      w: 0.3,
      h: 0.03,
      fill: '#ffffff',
      text: 'Bir kayıt seçin',
      size: 14,
      color: '#64748b',
      weight: '600',
    },
    {
      x: 0.58,
      y: 0.45,
      w: 0.35,
      h: 0.04,
      fill: '#ffffff',
      text: 'Soldan kampanya mesajına tıklayın',
      size: 12,
      color: '#94a3b8',
      weight: '500',
    },
  )
  return list
}

/** @type {Record<string, { src: string, out: string, cropTop?: boolean, overlays: (w: number, h: number) => Overlay[] }>} */
const jobs = {
  ozet: {
    src: 'shot-1.png',
    out: 'ozet.png',
    overlays: () => [
      ...chromeMasks(),
      // "Ali Test" alt başlık
      {
        x: 0.155,
        y: 0.1,
        w: 0.45,
        h: 0.03,
        fill: '#f7f8fb',
        text: 'Demo İşletme · günün operasyon görünümü',
        size: 13,
        color: '#64748b',
        weight: '500',
      },
      // alt durum / isimler
      { x: 0.15, y: 0.7, w: 0.55, h: 0.22, fill: '#ffffff' },
      { x: 0.16, y: 0.72, w: 0.22, h: 0.025, text: 'Satış hattı · 184 / 250', size: 12 },
      { x: 0.16, y: 0.755, w: 0.22, h: 0.025, text: 'Destek hattı · 96 / 250', size: 12 },
      { x: 0.16, y: 0.79, w: 0.24, h: 0.025, text: 'Kampanya yedek · QR bekliyor', size: 12 },
      { x: 0.42, y: 0.72, w: 0.25, h: 0.025, text: 'Bahar kampanyası · tamam', size: 12 },
      { x: 0.42, y: 0.755, w: 0.25, h: 0.025, text: 'Randevu hatırlatma · aktif', size: 12 },
      { x: 0.42, y: 0.79, w: 0.25, h: 0.025, text: 'Karşılama · taslak', size: 12 },
    ],
  },
  hesaplar: {
    src: 'shot-2.png',
    out: 'hesaplar.png',
    overlays: () => [
      ...chromeMasks(),
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
      { x: 0.15, y: 0.48, w: 0.5, h: 0.2, fill: '#ffffff' },
      { x: 0.17, y: 0.52, w: 0.4, h: 0.025, text: '☑  Satış hattı', size: 13 },
      { x: 0.17, y: 0.555, w: 0.42, h: 0.022, text: '+90 532 ··· ·· 01  ·  bugün 184 / 250 hak', size: 12, color: '#64748b', weight: '500' },
      { x: 0.17, y: 0.6, w: 0.4, h: 0.022, text: '☐  Destek hattı', size: 13, color: '#64748b', weight: '500' },
    ],
  },
  kisiler: {
    src: 'shot-4.png',
    out: 'kisiler.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.15, y: 0.2, w: 0.82, h: 0.55, fill: '#f7f8fb' },
      { x: 0.16, y: 0.22, w: 0.8, h: 0.5, fill: '#ffffff', rx: 10 },
      { x: 0.18, y: 0.26, w: 0.4, h: 0.03, text: 'Bahar 2026 · İstanbul', size: 15 },
      { x: 0.18, y: 0.3, w: 0.5, h: 0.025, text: '1.840 kişi · 1.620 WA kayıtlı · 220 yok', size: 12, color: '#64748b', weight: '500' },
      { x: 0.18, y: 0.38, w: 0.55, h: 0.025, text: '+90 532 ··· ·· 14  ·  Ayşe  ·  WA ✓', size: 12 },
      { x: 0.18, y: 0.43, w: 0.55, h: 0.025, text: '+90 533 ··· ·· 28  ·  Mehmet  ·  WA ✓', size: 12 },
      { x: 0.18, y: 0.48, w: 0.55, h: 0.025, text: '+90 544 ··· ·· 51  ·  Zeynep  ·  WA ✓', size: 12 },
      { x: 0.18, y: 0.53, w: 0.55, h: 0.025, text: '+90 555 ··· ·· 03  ·  Deniz  ·  kayıt yok', size: 12, color: '#94a3b8', weight: '500' },
    ],
  },
  karaListe: {
    src: 'shot-5.png',
    out: 'kara-liste.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.15, y: 0.22, w: 0.82, h: 0.4, fill: '#f7f8fb' },
      { x: 0.16, y: 0.26, w: 0.8, h: 0.2, fill: '#ffffff', rx: 10 },
      { x: 0.18, y: 0.3, w: 0.35, h: 0.03, text: '+90 544 ··· ·· 51', size: 14 },
      { x: 0.18, y: 0.34, w: 0.5, h: 0.025, text: 'Çıkmak istedi · kampanya STOP', size: 12, color: '#64748b', weight: '500' },
      { x: 0.18, y: 0.4, w: 0.35, h: 0.03, text: '+90 505 ··· ·· 77', size: 14 },
      { x: 0.18, y: 0.44, w: 0.5, h: 0.025, text: 'Elle eklendi · şikayet riski', size: 12, color: '#64748b', weight: '500' },
    ],
  },
  durum: {
    src: 'shot-6.png',
    out: 'durum.png',
    overlays: () => [
      ...chromeMasks(),
      { x: 0.15, y: 0.5, w: 0.82, h: 0.42, fill: '#f7f8fb' },
      { x: 0.16, y: 0.53, w: 0.38, h: 0.22, fill: '#ffffff', rx: 10 },
      { x: 0.18, y: 0.56, w: 0.34, h: 0.025, text: 'Satış hattı  ·  +90 532 ··· ·· 01  ·  Bağlı', size: 12 },
      { x: 0.18, y: 0.6, w: 0.34, h: 0.025, text: 'Destek hattı  ·  +90 532 ··· ·· 02  ·  Bağlı', size: 12 },
      { x: 0.18, y: 0.64, w: 0.34, h: 0.025, text: 'Kampanya yedek  ·  QR bekleniyor', size: 12 },
      { x: 0.56, y: 0.53, w: 0.4, h: 0.22, fill: '#ffffff', rx: 10 },
      { x: 0.58, y: 0.56, w: 0.35, h: 0.025, text: 'Bahar kampanyası  ·  Tamamlandı', size: 12 },
      { x: 0.58, y: 0.6, w: 0.35, h: 0.025, text: 'Randevu hatırlatma  ·  Çalışıyor', size: 12 },
      { x: 0.58, y: 0.64, w: 0.35, h: 0.025, text: 'Yeni müşteri karşılama  ·  Taslak', size: 12 },
      { x: 0.16, y: 0.78, w: 0.8, h: 0.14, fill: '#ffffff', rx: 10 },
      { x: 0.18, y: 0.81, w: 0.5, h: 0.022, text: 'Satış hattı bağlandı · 08:37', size: 12, color: '#64748b', weight: '500' },
      { x: 0.18, y: 0.85, w: 0.55, h: 0.022, text: 'Bahar kampanyası tamamlandı · 09:12', size: 12, color: '#64748b', weight: '500' },
      { x: 0.18, y: 0.89, w: 0.55, h: 0.022, text: 'Destek hattı kota yenilendi · 10:01', size: 12, color: '#64748b', weight: '500' },
    ],
  },
  raporlar: {
    src: 'shot-7.png',
    out: 'raporlar.png',
    overlays: () => [
      ...chromeMasks(),
      {
        x: 0.155,
        y: 0.1,
        w: 0.5,
        h: 0.03,
        fill: '#f7f8fb',
        text: 'Demo İşletme · kampanya performansı',
        size: 13,
        color: '#64748b',
        weight: '500',
      },
      { x: 0.15, y: 0.5, w: 0.82, h: 0.35, fill: '#f7f8fb' },
      { x: 0.16, y: 0.53, w: 0.38, h: 0.28, fill: '#ffffff', rx: 10 },
      { x: 0.18, y: 0.57, w: 0.3, h: 0.022, text: 'Bahar kampanyası · 1.840 giden', size: 12 },
      { x: 0.18, y: 0.61, w: 0.3, h: 0.022, text: 'Randevu hatırlatma · 420 giden', size: 12 },
      { x: 0.18, y: 0.65, w: 0.3, h: 0.022, text: 'Karşılama · 210 giden', size: 12 },
      { x: 0.56, y: 0.53, w: 0.38, h: 0.28, fill: '#ffffff', rx: 10 },
      { x: 0.58, y: 0.57, w: 0.3, h: 0.022, text: 'Satış hattı · 1.120', size: 12 },
      { x: 0.58, y: 0.61, w: 0.3, h: 0.022, text: 'Destek hattı · 640', size: 12 },
      { x: 0.58, y: 0.65, w: 0.3, h: 0.022, text: 'Teslim %92 · okundu %61', size: 12 },
    ],
  },
  gelenler: {
    src: 'gelenler-raw.png',
    out: 'gelenler.png',
    cropTop: true,
    overlays: () => [...chromeMasks(), ...demoInboxOverlays()],
  },
  gidenler: {
    src: 'gidenler-raw.png',
    out: 'gidenler.png',
    overlays: () => [...chromeMasks(), ...demoOutboxOverlays()],
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

    let pipeline = sharp(srcPath)
    const meta = await pipeline.metadata()
    let width = meta.width ?? 1800
    let height = meta.height ?? 1200

    // Showcase 16:10 — uzun sayfalarda yalnızca üst viewport’u al
    if (job.cropTop && height > Math.round(width * 0.72)) {
      height = Math.round(width * (10 / 16))
      pipeline = sharp(srcPath).extract({ left: 0, top: 0, width, height })
    }

    const overlays = job.overlays(width, height)
    const svg = svgOverlay(width, height, overlays)
    await pipeline
      .composite([{ input: svg, top: 0, left: 0 }])
      .png({ quality: 90 })
      .toFile(outPath)
    console.log('ok', key, '->', job.out, `${width}x${height}`)
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
