import fs from 'node:fs/promises'
import path from 'node:path'
import {
  compositeRealScreenToDevice,
  resolveSoftwareScreen,
} from '../apps/customer/src/lib/creative/screen-compositor'

async function main() {
  console.log('[ScreenCompositingGenerator] Generating 4 multi-device compositing showcases...')

  const outDir = path.resolve('C:/Users/TP2/Desktop/MESAJIFY_OMNISTUDIO_FINAL_DELIVERY/software_screen_compositing')
  await fs.mkdir(outDir, { recursive: true })

  // 1. Laptop (MacBook Pro 16) - Mesajify Dashboard
  const laptopScreen = await resolveSoftwareScreen('Mesajify', 'laptop')
  const laptopRes = await compositeRealScreenToDevice({
    backgroundBuffer: Buffer.alloc(0),
    screenshotBuffer: laptopScreen.buffer,
    device: 'laptop',
  })
  const laptopPath = path.join(outDir, '01_mesajify_laptop_macbook_pro.png')
  await fs.writeFile(laptopPath, laptopRes.compositedBuffer)
  console.log(`✓ 1. Laptop generated: ${laptopPath} (${laptopRes.width}x${laptopRes.height}, QA: ${laptopRes.qa.passed})`)

  // 2. Desktop (Studio Display 27) - Mesajify Campaign Manager
  const desktopScreen = await resolveSoftwareScreen('Mesajify', 'desktop')
  const desktopRes = await compositeRealScreenToDevice({
    backgroundBuffer: Buffer.alloc(0),
    screenshotBuffer: desktopScreen.buffer,
    device: 'desktop',
  })
  const desktopPath = path.join(outDir, '02_mesajify_desktop_studio_display.png')
  await fs.writeFile(desktopPath, desktopRes.compositedBuffer)
  console.log(`✓ 2. Desktop generated: ${desktopPath} (${desktopRes.width}x${desktopRes.height}, QA: ${desktopRes.qa.passed})`)

  // 3. Mobile (iPhone 16 Pro) - Mesajify Mobile App
  const mobileScreen = await resolveSoftwareScreen('Mesajify', 'mobile')
  const mobileRes = await compositeRealScreenToDevice({
    backgroundBuffer: Buffer.alloc(0),
    screenshotBuffer: mobileScreen.buffer,
    device: 'mobile',
  })
  const mobilePath = path.join(outDir, '03_mesajify_mobile_iphone16pro.png')
  await fs.writeFile(mobilePath, mobileRes.compositedBuffer)
  console.log(`✓ 3. Mobile generated: ${mobilePath} (${mobileRes.width}x${mobileRes.height}, QA: ${mobileRes.qa.passed})`)

  // 4. Tablet (iPad Pro 12.9) - Generic SaaS CRM
  const tabletScreen = await resolveSoftwareScreen('Acme Cloud CRM', 'tablet')
  const tabletRes = await compositeRealScreenToDevice({
    backgroundBuffer: Buffer.alloc(0),
    screenshotBuffer: tabletScreen.buffer,
    device: 'tablet',
  })
  const tabletPath = path.join(outDir, '04_generic_saas_crm_ipad_pro.png')
  await fs.writeFile(tabletPath, tabletRes.compositedBuffer)
  console.log(`✓ 4. Tablet generated: ${tabletPath} (${tabletRes.width}x${tabletRes.height}, QA: ${tabletRes.qa.passed})`)

  console.log('[ScreenCompositingGenerator] All 4 multi-device showcases successfully created!')
}

main().catch(console.error)
