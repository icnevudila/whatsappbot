import Link from 'next/link'
import { Card, CardHeader, PageHeader, QuietLink } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon'

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
      'Gruba bir ad ver (ör. Mahalle müşterileri).',
      'Kampanyada bu grubu seçeceksin.',
    ],
  },
  {
    icon: 'campaign',
    title: '3. Kampanya gönder',
    href: '/kampanyalar',
    tint: 'bg-accent-soft/40',
    steps: [
      'Mesajı yaz; istersen görsel ekle.',
      'Kişi grubunu ve hattı seç.',
      'Hemen gönder veya taslak kaydet. İlerlemeyi kampanya sayfasından izle.',
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
    'Şifremi unuttum',
    'Girişteki “Şifremi unuttum” ile e-posta iste. Spam’i de kontrol et.',
  ],
]

export default function YardimPage() {
  return (
    <>
      <PageHeader
        title="Nasıl yapılır?"
        description="Dönerci de bu üç adımı izler: hat → kişiler → gönder."
      />

      <div className="grid gap-2.5 sm:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.href}>
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
        <Link href="/ayarlar" className="underline underline-offset-2">
          Ayarlar
        </Link>
        ’dan bize yaz.
      </p>
    </>
  )
}
