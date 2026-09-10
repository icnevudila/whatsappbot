import type { IconName } from '@/components/icon'

export const SETTINGS_SECTIONS: {
  href: string
  title: string
  description: string
  icon: IconName
}[] = [
  {
    href: '/ayarlar/isletme',
    title: 'İşletme',
    description: 'Paket, işletme adı ve ekip',
    icon: 'overview',
  },
  {
    href: '/ayarlar/profil',
    title: 'Profil',
    description: 'Ad, firma ve oturum',
    icon: 'people',
  },
  {
    href: '/ayarlar/hatlar',
    title: 'Hatlar',
    description: 'WhatsApp hatlarını bağla ve yönet',
    icon: 'phone',
  },
  {
    href: '/ayarlar/engellenenler',
    title: 'Engellenen numaralar',
    description: 'Kampanyaya gitmeyen numaralar',
    icon: 'shield',
  },
  {
    href: '/ayarlar/gelismis',
    title: 'Gelişmiş',
    description: 'Webhook, API anahtarı ve fatura',
    icon: 'settings',
  },
  {
    href: '/ayarlar/marka',
    title: 'Marka kitleri',
    description: 'Listele, ekle, düzenle ve sil',
    icon: 'brand',
  },
  {
    href: '/ayarlar/sosyal',
    title: 'Sosyal medya',
    description: 'Hesap ekle, güncelle, sil',
    icon: 'activity',
  },
  {
    href: '/ayarlar/urunler',
    title: 'Ürünlerim',
    description: 'Katalog, görseller ve kutu içeriği',
    icon: 'campaign',
  },
]

export const SETTINGS_PREFETCH_HREFS = [
  '/ayarlar',
  ...SETTINGS_SECTIONS.map((section) => section.href),
]
