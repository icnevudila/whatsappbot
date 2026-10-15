import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import {
  compositeRealScreenToDevice,
  resolveSoftwareScreen,
} from '../apps/customer/src/lib/creative/screen-compositor'

async function renderOfficeEnvironmentBg(width: number, height: number, style: string): Promise<Buffer> {
  const isMobile = height > width

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wall" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#18191c" />
          <stop offset="50%" stop-color="#222428" />
          <stop offset="100%" stop-color="#141517" />
        </linearGradient>
        <linearGradient id="desk" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3c3024" />
          <stop offset="30%" stop-color="#2c2219" />
          <stop offset="100%" stop-color="#1a140e" />
        </linearGradient>
        <linearGradient id="sunlight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fff4e0" stop-opacity="0.18" />
          <stop offset="40%" stop-color="#ffd299" stop-opacity="0.06" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
        </linearGradient>
        <filter id="shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000000" flood-opacity="0.7" />
        </filter>
      </defs>

      <!-- Office Architectural Background -->
      <rect width="${width}" height="${height}" fill="url(#wall)" />

      <!-- Minimal Window architectural lines -->
      <line x1="${width * 0.1}" y1="0" x2="${width * 0.1}" y2="${height * 0.65}" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
      <line x1="${width * 0.4}" y1="0" x2="${width * 0.4}" y2="${height * 0.65}" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>

      <!-- Natural Oak Executive Desk Surface -->
      <polygon points="0,${height * 0.62} ${width},${height * 0.62} ${width},${height} 0,${height}" fill="url(#desk)" />
      <line x1="0" y1="${height * 0.62}" x2="${width}" y2="${height * 0.62}" stroke="#524334" stroke-width="2" />

      <!-- Ambient Morning Sunlight Rays -->
      <polygon points="0,0 ${width * 0.75},0 ${width * 0.3},${height} 0,${height}" fill="url(#sunlight)" />

      <!-- Coffee Mug on Desk (Contextual Real Usage Element) -->
      ${!isMobile ? `
        <ellipse cx="${width * 0.88}" cy="${height * 0.78}" rx="28" ry="14" fill="#0c0d0e" opacity="0.6"/>
        <rect x="${width * 0.88 - 24}" y="${height * 0.78 - 45}" width="48" height="45" rx="6" fill="#e2e8f0" />
        <ellipse cx="${width * 0.88}" cy="${height * 0.78 - 45}" rx="24" ry="10" fill="#2d1c11" />
      ` : ''}
    </svg>
  `
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function main() {
  console.log('[RealSceneCompositing] Testing 4 Mesajify modes on authentic realistic backgrounds...')

  const outDir = path.resolve('C:/Users/TP2/Desktop/MESAJIFY_OMNISTUDIO_FINAL_DELIVERY/before_after_comparison')
  await fs.mkdir(outDir, { recursive: true })

  // Mode 1: Mesajify Akıllı Kampanya (Frontal Laptop on Executive Desk)
  const bg1 = await renderOfficeEnvironmentBg(1920, 1080, 'executive')
  const screen1 = await resolveSoftwareScreen('Mesajify', 'laptop')
  const res1 = await compositeRealScreenToDevice({
    backgroundBuffer: bg1,
    screenshotBuffer: screen1.buffer,
    device: 'laptop',
    angle: 'frontal',
  })
  const path1 = path.join(outDir, 'after_01_mesajify_akilli_kampanya_frontal_laptop.png')
  await fs.writeFile(path1, res1.compositedBuffer)
  console.log(`✓ Mode 1 Generated: ${path1} (QA: ${res1.qa.passed})`)

  // Mode 2: Mesajify Gösterişli Kampanya (Studio Display Desktop on Office Desk)
  const bg2 = await renderOfficeEnvironmentBg(1920, 1080, 'studio')
  const screen2 = await resolveSoftwareScreen('Mesajify', 'desktop')
  const res2 = await compositeRealScreenToDevice({
    backgroundBuffer: bg2,
    screenshotBuffer: screen2.buffer,
    device: 'desktop',
    angle: 'frontal',
  })
  const path2 = path.join(outDir, 'after_02_mesajify_gosterisli_kampanya_studio_display.png')
  await fs.writeFile(path2, res2.compositedBuffer)
  console.log(`✓ Mode 2 Generated: ${path2} (QA: ${res2.qa.passed})`)

  // Mode 3: Mesajify Gerçek Kullanım (Natural 3/4 Angled Laptop with Perspective Foreshortening)
  const bg3 = await renderOfficeEnvironmentBg(1920, 1080, 'natural_desk')
  const screen3 = await resolveSoftwareScreen('Mesajify', 'laptop')
  const res3 = await compositeRealScreenToDevice({
    backgroundBuffer: bg3,
    screenshotBuffer: screen3.buffer,
    device: 'laptop',
    angle: 'three_quarter_right',
  })
  const path3 = path.join(outDir, 'after_03_mesajify_gercek_kullanim_three_quarter_laptop.png')
  await fs.writeFile(path3, res3.compositedBuffer)
  console.log(`✓ Mode 3 Generated: ${path3} (QA: ${res3.qa.passed})`)

  // Mode 4: Mesajify Premium Vitrin / Mobile Story (iPhone 16 Pro Vertical Story)
  const bg4 = await renderOfficeEnvironmentBg(1080, 1920, 'minimal_vertical')
  const screen4 = await resolveSoftwareScreen('Mesajify', 'mobile')
  const res4 = await compositeRealScreenToDevice({
    backgroundBuffer: bg4,
    screenshotBuffer: screen4.buffer,
    device: 'mobile',
    angle: 'frontal',
  })
  const path4 = path.join(outDir, 'after_04_mesajify_premium_vitrin_mobile_story.png')
  await fs.writeFile(path4, res4.compositedBuffer)
  console.log(`✓ Mode 4 Generated: ${path4} (QA: ${res4.qa.passed})`)

  // Copy prior "Before" images to the comparison directory for side-by-side inspection
  const desktopRoot = path.resolve('C:/Users/TP2/Desktop/MESAJIFY_OMNISTUDIO_FINAL_DELIVERY')
  const beforeFiles = [
    { src: '01_mesajify_akilli_kampanya.png', dst: 'before_01_mesajify_akilli_kampanya_ai_fake_screen.png' },
    { src: '02_mesajify_gosterisli_kampanya.png', dst: 'before_02_mesajify_gosterisli_kampanya_ai_fake_screen.png' },
    { src: '03_mesajify_gercek_kullanim.png', dst: 'before_03_mesajify_gercek_kullanim_ai_sideways_laptop.png' },
    { src: '04_mesajify_premium_vitrin.png', dst: 'before_04_mesajify_premium_vitrin_ai_fake_screen.png' },
  ]

  for (const b of beforeFiles) {
    const srcPath = path.join(desktopRoot, b.src)
    const dstPath = path.join(outDir, b.dst)
    try {
      await fs.copyFile(srcPath, dstPath)
      console.log(`✓ Before copied: ${b.dst}`)
    } catch (e) {
      console.warn(`Could not copy ${srcPath}:`, e)
    }
  }

  // Create Side-by-Side Comparison Montages for instant visual verification
  for (let i = 1; i <= 4; i++) {
    const bName = beforeFiles[i - 1].dst
    const aName = [
      'after_01_mesajify_akilli_kampanya_frontal_laptop.png',
      'after_02_mesajify_gosterisli_kampanya_studio_display.png',
      'after_03_mesajify_gercek_kullanim_three_quarter_laptop.png',
      'after_04_mesajify_premium_vitrin_mobile_story.png',
    ][i - 1]

    const bPath = path.join(outDir, bName)
    const aPath = path.join(outDir, aName)

    try {
      const bBuf = await fs.readFile(bPath)
      const aBuf = await fs.readFile(aPath)

      const bMeta = await sharp(bBuf).metadata()
      const aMeta = await sharp(aBuf).metadata()

      // Standardize height for comparison strip
      const targetH = 720
      const bResized = await sharp(bBuf).resize({ height: targetH }).png().toBuffer()
      const aResized = await sharp(aBuf).resize({ height: targetH }).png().toBuffer()

      const bResMeta = await sharp(bResized).metadata()
      const aResMeta = await sharp(aResized).metadata()

      const totalW = (bResMeta.width || 720) + (aResMeta.width || 720) + 40

      const montageSvg = `
        <svg width="${totalW}" height="${targetH + 80}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${totalW}" height="${targetH + 80}" fill="#0f1115" />
          <text x="30" y="45" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ef4444">❌ ÖNCESİ (AI Sahte Arayüz / Bozuk / Yan Laptop)</text>
          <text x="${(bResMeta.width || 720) + 50}" y="45" font-family="sans-serif" font-size="24" font-weight="bold" fill="#25C96F">✅ SONRASI (Deterministik Gerçek Panel Kompoziti)</text>
        </svg>
      `

      const montage = await sharp(Buffer.from(montageSvg))
        .composite([
          { input: bResized, left: 20, top: 65 },
          { input: aResized, left: (bResMeta.width || 720) + 40, top: 65 },
        ])
        .png()
        .toBuffer()

      const montagePath = path.join(outDir, `karsilastirma_0${i}_yan_yana.png`)
      await fs.writeFile(montagePath, montage)
      console.log(`✓ Montage ${i} created: ${montagePath}`)
    } catch (mErr) {
      console.warn(`Montage ${i} failed:`, mErr)
    }
  }

  console.log('[RealSceneCompositing] All 4 modes and side-by-side montages generated successfully!')
}

main().catch(console.error)
