import Link from 'next/link'
import { Card, CardHeader, PageHeader, QuietLink } from '@/components/ui'
import { Icon } from '@/components/icon'

export const metadata = { title: 'Yardım merkezi' }

const guides = [
  {
    icon: 'phone' as const,
    title: 'WhatsApp hattını bağlama',
    href: '/hesaplar',
    steps: [
      'WhatsApp hatları ekranında yeni bir hat oluşturun.',
      'QR kodunu telefonunuzdaki Bağlı cihazlar bölümünden okutun veya telefon koduyla eşleştirin.',
      'Durum “Bağlı” olduğunda hattınızı gönderim için seçebilirsiniz. Süresi dolan QR için yeniden bağlanın.',
    ],
  },
  {
    icon: 'people' as const,
    title: 'Kişileri hazırlama',
    href: '/kisiler',
    steps: [
      'CSV yükleyin veya numaraları satır satır yapıştırın. İsim eklemek için numaradan sonra virgül kullanabilirsiniz.',
      'Ülke kodu olmayan Türkiye numaraları +90 ile düzenlenir. Tekrarlanan numaralar ayıklanır.',
      'Doğrulama için bağlı hat gerekir. WhatsApp kaydı iletişim izni yerine geçmez.',
    ],
  },
  {
    icon: 'campaign' as const,
    title: 'Kampanya gönderme',
    href: '/kampanyalar',
    steps: [
      'Kampanya adını ve mesajı yazın; gerekirse görsel yükleyin.',
      'Kişi listelerini ve gönderici hatları seçin. {{ad}} ifadesi kişi adıyla doldurulur.',
      'Başlattıktan sonra gönderildi, atlandı ve başarısız sonuçlarını kampanya ayrıntısından izleyin. Duraklatma sürmekte olan tek mesajı geri almaz.',
    ],
  },
  {
    icon: 'inbox' as const,
    title: 'Yanıtları yönetme',
    href: '/gelenler',
    steps: [
      'Gelen kutusunda bir konuşma seçin; tam geçmişi veya yalnız gelen mesajları görün.',
      'Yanıtınızı yazıp gönderin. İşlem sıraya alınır; sonucu konuşmanın altında gösterilir.',
      'İletişim istemeyen kişiyi kara listeye alın. Bu numara sonraki gönderimlerden çıkarılır.',
    ],
  },
]

const faqs: [string, string][] = [
  [
    'Gönderim kuyrukta bekliyor',
    'Bağlı ve gönderime açık bir hat olduğunu kontrol edin. Günlük kota dolmuş, bekleme aralığı sürüyor veya servis geçici olarak yanıt vermiyor olabilir. Genel bakıştaki hat ve kuyruk durumuna bakın.',
  ],
  [
    'Gönderim sonucu belirsiz',
    'Bağlantı gönderim sırasında kesilmiş olabilir. Çift mesajı önlemek için otomatik tekrar yapılmaz. Yeniden göndermeden önce telefonunuzdaki konuşmayı kontrol edin.',
  ],
  [
    'Şifremi unuttum',
    'Giriş ekranındaki “Şifremi unuttum” bağlantısıyla e-posta isteyin. Bağlantıyı aynı tarayıcıda açın. Spam klasörünü kontrol edin; eski bağlantı yerine en son gönderileni kullanın.',
  ],
  [
    'Görsel veya metin üretimi açık değil',
    'Yapay zekâ özellikleri sunucu yapılandırmasına bağlıdır. Ayarlar’dan kullanılabilir özellikleri kontrol edin. Marka şablonları ve kendi görselinizi yükleme ayrı seçeneklerdir.',
  ],
]

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Yardım merkezi"
        description="İlk bağlantıdan günlük kullanıma, ihtiyacınız olan adımlar."
      />

      <div className="grid gap-2.5 lg:grid-cols-2">
        {guides.map((guide) => (
          <Card key={guide.title}>
            <CardHeader
              title={
                <span className="flex items-center gap-2.5">
                  <Icon name={guide.icon} className="text-accent" />
                  {guide.title}
                </span>
              }
            />
            <ol className="space-y-2.5 p-3.5">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-muted">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-canvas font-mono text-[11px] text-accent">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="px-3.5 pb-3.5">
              <QuietLink href={guide.href}>İlgili ekrana git →</QuietLink>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-4">
        <h2 className="mb-2.5 text-[15px] font-semibold">Bir şey beklediğiniz gibi çalışmıyor mu?</h2>
        {faqs.map(([q, a]) => (
          <details key={q} className="border-b border-hairline">
            <summary className="cursor-pointer py-2.5 text-[13px] font-medium">{q}</summary>
            <p className="max-w-3xl pb-3.5 text-[12.5px] leading-relaxed text-ink-muted">{a}</p>
          </details>
        ))}
        <p className="mt-4 text-[12.5px] text-ink-muted">
          Sorun sürerse işletmenizin destek sorumlusuna ilgili ekranı, işlem zamanını ve varsa
          hata kodunu iletin.{' '}
          <Link href="/durum" className="text-accent underline">
            Genel bakışı açın.
          </Link>
        </p>
      </div>
    </>
  )
}
