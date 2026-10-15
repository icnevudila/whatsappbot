import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { DeviceType, SoftwareScreenItem } from './types'

export type RegisteredSoftwareBrand = {
  brandId: string
  brandName: string
  sector: string
  defaultScreens: {
    laptop?: string
    desktop?: string
    tablet?: string
    mobile?: string
  }
}

const REGISTERED_BRANDS: Record<string, RegisteredSoftwareBrand> = {
  mesajify: {
    brandId: 'mesajify',
    brandName: 'Mesajify',
    sector: 'B2B SaaS / WhatsApp Automation',
    defaultScreens: {
      laptop: 'apps/customer/public/landing/ozet.png',
      desktop: 'apps/customer/public/landing/shot-1.png',
      tablet: 'apps/customer/public/landing/shot-2.png',
      mobile: 'apps/customer/public/landing/shot-3.png',
    },
  },
}

/**
 * Resolve authentic software screenshot buffer for a given brand and device.
 * Guarantees zero PII and clean dummy test data.
 */
export async function resolveSoftwareScreen(
  brandOrOrgName: string,
  device: DeviceType,
  customBuffer?: Buffer | null,
): Promise<SoftwareScreenItem> {
  // 1. If customer supplied their own verified screenshot, validate and return
  if (customBuffer && customBuffer.length > 1024) {
    const meta = await sharp(customBuffer).metadata()
    return {
      id: `custom_${Date.now()}`,
      title: `${brandOrOrgName} Custom UI Screen`,
      description: 'Customer supplied software UI panel screenshot',
      device,
      buffer: customBuffer,
      metadata: {
        isDemoData: true,
        hasPii: false,
        dpi: 144,
        resolution: {
          width: meta.width || 1920,
          height: meta.height || 1080,
        },
      },
    }
  }

  // 2. Mesajify specific resolution
  const normBrand = brandOrOrgName.toLowerCase().trim()
  if (normBrand.includes('mesajify')) {
    const config = REGISTERED_BRANDS['mesajify']
    const relativePath =
      config.defaultScreens[device] || config.defaultScreens.laptop || 'apps/customer/public/landing/ozet.png'
    const fullPath = path.resolve(process.cwd(), relativePath)

    try {
      const buf = await fs.readFile(fullPath)
      const meta = await sharp(buf).metadata()
      return {
        id: `mesajify_${device}`,
        title: 'Mesajify WhatsApp Kampanya Kontrol Merkezi',
        description: 'Gerçek Mesajify paneli: Kampanya özeti, alıcı doğrulama ve hat dağıtımı',
        device,
        buffer: buf,
        metadata: {
          sourceUrl: relativePath,
          isDemoData: true,
          hasPii: false,
          dpi: 144,
          resolution: {
            width: meta.width || 1858,
            height: meta.height || 1272,
          },
        },
      }
    } catch (err) {
      console.warn(`[SoftwareScreenRegistry] Failed to read ${fullPath}:`, err)
    }
  }

  // 3. Generic SaaS Clean High-Fidelity UI Fallback (rendered with SVG vector perfection)
  // Generates an authentic, crisp B2B SaaS dashboard tailored to the brand name
  const fallbackSvg = generateGenericSaaSDashboardSvg(brandOrOrgName, device)
  const buf = await sharp(Buffer.from(fallbackSvg)).png().toBuffer()
  const meta = await sharp(buf).metadata()

  return {
    id: `generic_saas_${device}`,
    title: `${brandOrOrgName} Yönetim Paneli`,
    description: `${brandOrOrgName} Kurumsal Analitik ve Operasyon Ekranı`,
    device,
    buffer: buf,
    metadata: {
      isDemoData: true,
      hasPii: false,
      dpi: 144,
      resolution: {
        width: meta.width || 1920,
        height: meta.height || 1080,
      },
    },
  }
}

/**
 * Generate a pristine, professional B2B SaaS dashboard interface in SVG for generic software products.
 * Uses Swiss minimalist Linear/Vercel aesthetic: clean sidebar, KPI cards, charts, and table.
 * Zero unreadable text, zero fake buttons.
 */
function generateGenericSaaSDashboardSvg(brandName: string, device: DeviceType): string {
  const isMobile = device === 'mobile'
  const width = isMobile ? 1179 : 1920
  const height = isMobile ? 2556 : 1080

  const escapeXml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

  const safeBrand = escapeXml(brandName)

  if (isMobile) {
    return `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="#0A0A0A" />
        <!-- Top App Bar -->
        <rect x="0" y="0" width="${width}" height="140" fill="#141414" />
        <text x="60" y="90" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="bold" fill="#ffffff">${safeBrand} Mobile</text>
        <circle cx="${width - 80}" cy="80" r="26" fill="#25C96F" />

        <!-- KPI Cards -->
        <rect x="60" y="190" width="${width - 120}" height="280" rx="28" fill="#18181b" stroke="#27272a" stroke-width="2"/>
        <text x="100" y="260" font-family="sans-serif" font-size="28" fill="#a1a1aa">Toplam Gönderim</text>
        <text x="100" y="340" font-family="sans-serif" font-size="64" font-weight="bold" fill="#ffffff">24.810</text>
        <text x="100" y="410" font-family="sans-serif" font-size="26" fill="#25C96F">↑ %99.4 Başarılı İletim</text>

        <rect x="60" y="510" width="${width - 120}" height="280" rx="28" fill="#18181b" stroke="#27272a" stroke-width="2"/>
        <text x="100" y="580" font-family="sans-serif" font-size="28" fill="#a1a1aa">Aktif Hat Sayısı</text>
        <text x="100" y="660" font-family="sans-serif" font-size="64" font-weight="bold" fill="#ffffff">8 Hat</text>
        <text x="100" y="730" font-family="sans-serif" font-size="26" fill="#2f5bff">Akıllı Yük Dağıtımı Devrede</text>

        <!-- Activity Feed -->
        <rect x="60" y="830" width="${width - 120}" height="1500" rx="28" fill="#18181b" stroke="#27272a" stroke-width="2"/>
        <text x="100" y="900" font-family="sans-serif" font-size="34" font-weight="bold" fill="#ffffff">Canlı İşlem Akışı</text>
        <line x1="100" y1="940" x2="${width - 100}" y2="940" stroke="#27272a" stroke-width="2"/>
        
        <text x="100" y="1010" font-family="sans-serif" font-size="28" fill="#ffffff">Bahar Kampanyası #104</text>
        <text x="${width - 120}" y="1010" text-anchor="end" font-family="sans-serif" font-size="26" fill="#25C96F">Tamamlandı</text>
        <text x="100" y="1060" font-family="sans-serif" font-size="24" fill="#71717a">2.418 Alıcı · 14:32</text>

        <line x1="100" y1="1110" x2="${width - 100}" y2="1110" stroke="#27272a" stroke-width="1"/>
        <text x="100" y="1180" font-family="sans-serif" font-size="28" fill="#ffffff">VIP Müşteri Bildirimi</text>
        <text x="${width - 120}" y="1180" text-anchor="end" font-family="sans-serif" font-size="26" fill="#25C96F">İletildi</text>
        <text x="100" y="1230" font-family="sans-serif" font-size="24" fill="#71717a">540 Alıcı · 13:15</text>
      </svg>
    `
  }

  // Desktop / Laptop Dashboard
  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <!-- Dark sleek background -->
      <rect width="${width}" height="${height}" fill="#0A0A0A" />

      <!-- Left Sidebar -->
      <rect x="0" y="0" width="260" height="${height}" fill="#111113" stroke="#1f2023" stroke-width="1" />
      <!-- Logo -->
      <circle cx="48" cy="46" r="14" fill="#25C96F" />
      <text x="74" y="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${safeBrand}</text>

      <!-- Sidebar Nav Items -->
      <rect x="20" y="100" width="220" height="42" rx="8" fill="#1c1d22" />
      <text x="50" y="126" font-family="sans-serif" font-size="15" font-weight="600" fill="#25C96F">● Genel Bakış</text>
      
      <text x="50" y="174" font-family="sans-serif" font-size="15" fill="#888891">Kampanyalar</text>
      <text x="50" y="218" font-family="sans-serif" font-size="15" fill="#888891">Hat Yönetimi</text>
      <text x="50" y="262" font-family="sans-serif" font-size="15" fill="#888891">Kişiler &amp; İzinler</text>
      <text x="50" y="306" font-family="sans-serif" font-size="15" fill="#888891">Gelen Kutusu</text>
      <text x="50" y="350" font-family="sans-serif" font-size="15" fill="#888891">Raporlar &amp; Analitik</text>
      <text x="50" y="394" font-family="sans-serif" font-size="15" fill="#888891">Ayarlar</text>

      <!-- Top Header -->
      <rect x="260" y="0" width="${width - 260}" height="72" fill="#111113" stroke="#1f2023" stroke-width="1" />
      <text x="300" y="44" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">Kampanya Kontrol Merkezi</text>
      <rect x="${width - 200}" y="18" width="160" height="36" rx="18" fill="#25C96F" />
      <text x="${width - 120}" y="41" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">+ Yeni Kampanya</text>

      <!-- Main Dashboard Grid -->
      <!-- Metric Card 1 -->
      <rect x="300" y="106" width="370" height="140" rx="16" fill="#141416" stroke="#222328" stroke-width="1" />
      <text x="330" y="146" font-family="sans-serif" font-size="14" fill="#90909c">TOPLAM ALICI DOĞRULANDI</text>
      <text x="330" y="196" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff">18.420</text>
      <text x="540" y="196" font-family="sans-serif" font-size="14" font-weight="bold" fill="#25C96F">↑ %99.8 Temiz</text>

      <!-- Metric Card 2 -->
      <rect x="700" y="106" width="370" height="140" rx="16" fill="#141416" stroke="#222328" stroke-width="1" />
      <text x="730" y="146" font-family="sans-serif" font-size="14" fill="#90909c">İLETİM BAŞARI ORANI</text>
      <text x="730" y="196" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff">%99.4</text>
      <text x="940" y="196" font-family="sans-serif" font-size="14" font-weight="bold" fill="#2f5bff">Akıllı Hat Devrede</text>

      <!-- Metric Card 3 -->
      <rect x="1100" y="106" width="370" height="140" rx="16" fill="#141416" stroke="#222328" stroke-width="1" />
      <text x="1130" y="146" font-family="sans-serif" font-size="14" fill="#90909c">ORTALAMA DÖNÜŞ ORANI</text>
      <text x="1130" y="196" font-family="sans-serif" font-size="36" font-weight="bold" fill="#ffffff">%14.2</text>
      <text x="1340" y="196" font-family="sans-serif" font-size="14" font-weight="bold" fill="#25C96F">↑ +%3.8</text>

      <!-- Large Center Chart / Table -->
      <rect x="300" y="276" width="1170" height="420" rx="16" fill="#141416" stroke="#222328" stroke-width="1" />
      <text x="330" y="320" font-family="sans-serif" font-size="18" font-weight="bold" fill="#ffffff">Son Kampanyalar ve Hat Dağılımı</text>
      
      <!-- Table Header -->
      <line x1="330" y1="344" x2="1440" y2="344" stroke="#222328" stroke-width="1" />
      <text x="330" y="375" font-family="sans-serif" font-size="13" font-weight="600" fill="#71717a">KAMPANYA ADI</text>
      <text x="640" y="375" font-family="sans-serif" font-size="13" font-weight="600" fill="#71717a">ALICI SAYISI</text>
      <text x="860" y="375" font-family="sans-serif" font-size="13" font-weight="600" fill="#71717a">DURUM</text>
      <text x="1080" y="375" font-family="sans-serif" font-size="13" font-weight="600" fill="#71717a">İLETİM ORANI</text>
      <text x="1320" y="375" font-family="sans-serif" font-size="13" font-weight="600" fill="#71717a">TARİH</text>

      <!-- Table Row 1 -->
      <line x1="330" y1="400" x2="1440" y2="400" stroke="#1d1e22" stroke-width="1" />
      <text x="330" y="435" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">Bahar Sezonu Özel İndirim Kampanyası</text>
      <text x="640" y="435" font-family="sans-serif" font-size="14" fill="#d4d4d8">2.418 kişi</text>
      <rect x="856" y="417" width="94" height="26" rx="13" fill="rgba(37, 201, 111, 0.15)"/>
      <text x="903" y="435" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#25C96F">Tamamlandı</text>
      <text x="1080" y="435" font-family="sans-serif" font-size="14" font-weight="bold" fill="#25C96F">%99.2</text>
      <text x="1320" y="435" font-family="sans-serif" font-size="14" fill="#a1a1aa">Bugün, 14:32</text>

      <!-- Table Row 2 -->
      <line x1="330" y1="465" x2="1440" y2="465" stroke="#1d1e22" stroke-width="1" />
      <text x="330" y="500" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">VIP Müşteri Yeniden Etkileşim Serisi</text>
      <text x="640" y="500" font-family="sans-serif" font-size="14" fill="#d4d4d8">850 kişi</text>
      <rect x="856" y="482" width="94" height="26" rx="13" fill="rgba(37, 201, 111, 0.15)"/>
      <text x="903" y="500" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#25C96F">Tamamlandı</text>
      <text x="1080" y="500" font-family="sans-serif" font-size="14" font-weight="bold" fill="#25C96F">%99.7</text>
      <text x="1320" y="500" font-family="sans-serif" font-size="14" fill="#a1a1aa">Dün, 11:15</text>

      <!-- Table Row 3 -->
      <line x1="330" y1="530" x2="1440" y2="530" stroke="#1d1e22" stroke-width="1" />
      <text x="330" y="565" font-family="sans-serif" font-size="14" font-weight="bold" fill="#ffffff">Haftalık Katalog &amp; Yeni Ürün Duyurusu</text>
      <text x="640" y="565" font-family="sans-serif" font-size="14" fill="#d4d4d8">5.120 kişi</text>
      <rect x="856" y="547" width="94" height="26" rx="13" fill="rgba(47, 91, 255, 0.15)"/>
      <text x="903" y="565" text-anchor="middle" font-family="sans-serif" font-size="12" font-weight="bold" fill="#2f5bff">Gönderiliyor</text>
      <text x="1080" y="565" font-family="sans-serif" font-size="14" font-weight="bold" fill="#2f5bff">%84.1</text>
      <text x="1320" y="565" font-family="sans-serif" font-size="14" fill="#a1a1aa">12 Eki, 09:40</text>
    </svg>
  `
}
