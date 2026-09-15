import type { IconName } from '@/components/icon'

export const SETTINGS_SECTIONS: {
  href: string
  title: string
  description: string
  icon: IconName
  color: string
  group: string
}[] = [
  {
    href: '/ayarlar/isletme',
    title: 'İşletme',
    description: 'Paket, işletmeler, ad ve ekip',
    icon: 'overview',
    color: '#00a884',
    group: 'Hesap',
  },
  {
    href: '/ayarlar/profil',
    title: 'Profil',
    description: 'Ad, firma ve oturum',
    icon: 'people',
    color: '#53bdeb',
    group: 'Hesap',
  },
  {
    href: '/ayarlar/hatlar',
    title: 'Hatlar',
    description: 'WhatsApp hatlarını bağla ve yönet',
    icon: 'phone',
    color: '#008069',
    group: 'Hesap',
  },
  {
    href: '/ayarlar/engellenenler',
    title: 'Engellenen numaralar',
    description: 'Kampanyaya gitmeyen numaralar',
    icon: 'shield',
    color: '#e17076',
    group: 'Gizlilik',
  },
  {
    href: '/ayarlar/marka',
    title: 'Marka kitleri',
    description: 'Listele, ekle, düzenle ve sil',
    icon: 'brand',
    color: '#a586e8',
    group: 'İş',
  },
  {
    href: '/ayarlar/sosyal',
    title: 'Sosyal medya',
    description: 'Hesap ekle, güncelle, sil',
    icon: 'activity',
    color: '#ff8a65',
    group: 'İş',
  },
  {
    href: '/ayarlar/urunler',
    title: 'Ürünlerim',
    description: 'Katalog, görseller ve kutu içeriği',
    icon: 'campaign',
    color: '#7bc862',
    group: 'İş',
  },
  {
    href: '/ayarlar/gelismis',
    title: 'Gelişmiş',
    description: 'Webhook, API ve faturalama',
    icon: 'settings',
    color: '#8696a0',
    group: 'Diğer',
  },
]

export const SETTINGS_PREFETCH_HREFS = [
  '/ayarlar',
  ...SETTINGS_SECTIONS.map((section) => section.href),
]
