import Link from 'next/link'
import { Card, CardHeader, PageHeader, QuietLink } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon'
import { CONTACT_EMAIL, contactMailto } from '@/lib/contact'

export const metadata = { title: 'Yardım' }

const guides: {
  icon: IconName
  title: string
  href: string
  tint: string
  steps: string[]
}[] = [
  {
    icon: 'phone',
    title: '1. WhatsApp hattını bağla',
    href: '/hesaplar',
    tint: 'bg-ok-soft/45',
    steps: [
      'Hatlar’da yeni hat ekle.',
      'Telefondaki WhatsApp → Bağlı cihazlar → QR okut.',
      'Durum “Bağlı” olunca gönderime hazırsın.',
    ],
  },
  {
    icon: 'people',
    title: '2. Kişi grubu ekle',
    href: '/kisiler',
    tint: 'bg-accent-soft/55',
    steps: [
      'Excel / CSV yükle veya numaraları yapıştır.',
      'İstersen «WhatsApp rehberinden çek» ile bağlı hattan kişi al.',
      'WhatsApp doğrula ile ✓ / × işaretle; tek numara için sağdaki kontrolü kullan.',
    ],
  },
  {
    icon: 'campaign',
    title: '3. Kampanya veya tek numara',
    href: '/kampanyalar',
    tint: 'bg-accent-soft/40',
    steps: [
      'Toplu için: mesaj + grup + hat seç, gönder.',
      'Tek numara / test için: Kampanyalar’da üstteki bölümü aç.',
      'İlerlemeyi kampanya sayfasından izle.',
    ],
  },
  {
    icon: 'inbox',
    title: 'Cevapları oku',
    href: '/mesajlar',
    tint: 'bg-ok-soft/55',
    steps: [
      'Mesajlar’da gelen cevapları aç.',
      'İstersen oradan yanıtla.',
      'İstemiyorum / YAZMAYIN yazanları İstemeyenler’e al — bir daha gitmez.',
    ],
  },
]

const faqs: [string, string][] = [
  [
    'Mesaj gitmiyor',
    'Hat “Bağlı” mı bak. Günlük limit dolmuş olabilir. Kampanyayı açıp hata satırına bak.',
  ],
  [
    'Çift mesaj korkusu',
    'Bağlantı kopunca otomatik tekrar yok. Telefondan konuşmayı kontrol et, gerekirse yeniden gönder.',
  ],
  [
    'Raporlar nerede?',
    'Soldaki Raporlar’da 7–90 gün özet ve CSV var. Özet’teki “7 gün giden” de oraya gider.',
  ],
  [
    'Şifremi unuttum',
    'Girişteki “Şifremi unuttum” ile e-posta iste. Spam’i de kontrol et.',
  ],
]

export default function YardimPage() {
  return (
    <>
      <PageHeader
        title="Nasıl yapılır?"
        description="Hat bağla → kişi grubu → kampanya. Yeniysen Başlangıç’tan ilerle."
        action={<QuietLink href="/kurulum">Başlangıç</QuietLink>}
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.href + guide.title}>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-flex size-8 items-center justify-center rounded-md ${guide.tint}`}
                  >
                    <Icon name={guide.icon} className="size-4" />
                  </span>
                  {guide.title}
                </span>
              }
              action={<QuietLink href={guide.href}>Aç →</QuietLink>}
            />
            <ol className="list-decimal space-y-1.5 px-3.5 pb-3.5 pl-8 text-[12.5px] leading-snug text-ink-muted">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </Card>
        ))}
      </div>

      <Card className="mt-2.5">
        <CardHeader title="Sık sorulanlar" />
        <dl className="divide-y divide-hairline">
          {faqs.map(([q, a]) => (
            <div key={q} className="px-3.5 py-3">
              <dt className="text-[13px] font-semibold text-ink">{q}</dt>
              <dd className="mt-1 text-[12.5px] leading-relaxed text-ink-muted">{a}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="mt-3 text-center text-[12px] text-ink-faint">
        Takılırsan{' '}
        <a
          href={contactMailto('Filo yardım')}
          className="font-medium text-accent underline underline-offset-2"
        >
          {CONTACT_EMAIL}
        </a>
        {' · '}
        <Link href="/marka-kiti" className="underline underline-offset-2">
          Marka
        </Link>
      </p>
    </>
  )
}
