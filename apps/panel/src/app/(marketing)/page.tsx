import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/components/brand'
import { CapacityCalculator } from './capacity-calculator'
import { HeroPanel } from './hero-panel'

export const metadata: Metadata = {
  // absolute: kok layout'taki "%s · Filo" sablonu burada isim tekrarina yol aciyor.
  title: { absolute: `${BRAND_NAME} — Çoklu WhatsApp hattından toplu kampanya gönderimi` },
  description:
    'Kendi WhatsApp hatlarınızı bağlayın, kişi listenizi yükleyin, hattı yakmayan hızda toplu kampanya gönderin. Numara doğrulama, ısındırma ve otomatik durdurma dahil.',
}

const STEPS = [
  {
    n: '01',
    title: 'Hatlarınızı bağlayın',
    body: 'Panelde QR kodu çıkar, telefonunuzdan okutursunuz. Aynı anda kaç hat isterseniz. Oturumlar sunucuda tutulur, panel kapalıyken de bağlı kalır.',
  },
  {
    n: '02',
    title: 'Kişileri yükleyin',
    body: 'CSV yükleyin ya da numaraları doğrudan yapıştırın. Ülke koduna çevrilir ve WhatsApp’ta kayıtlı olup olmadığı kontrol edilir.',
  },
  {
    n: '03',
    title: 'Kampanyayı başlatın',
    body: 'Mesajı yazın, görseli ekleyin, hatları seçin. Gerisi arka planda çalışır; siz paneli kapatsanız da gönderim sürer.',
  },
]

const SAFETY = [
  {
    title: 'Numara doğrulama kapısı',
    body: 'Gönderimden önce her numara WhatsApp’ta kayıtlı mı diye kontrol edilir. Kayıtsız numaraya denemek kısıt almanın en hızlı yolu.',
  },
  {
    title: 'Gerçek kotanın okunması',
    body: 'WhatsApp’ın hesabınıza tanıdığı yeni sohbet kotasını ve varsa geçici kilidi doğrudan kaynaktan okuyup panelde gösteriyoruz. Tahmin yok.',
  },
  {
    title: 'Isındırma eğrisi',
    body: 'Yeni hat ilk gün 10, birinci hafta 120, ikinci haftadan sonra günde 250 mesaja çıkar. Bu tavan panelden aşılamaz.',
  },
  {
    title: 'İnsani gönderim aralığı',
    body: 'Mesajlar arasında rastgele bekleme var. Sabit aralıklarla atılan mesaj, otomasyonun en kolay yakalanan imzası.',
  },
  {
    title: 'Otomatik durdurma',
    body: 'Hat kısıt sinyali verdiği anda kampanya o hattan durur, diğerlerinden devam eder. Kampanyanın tamamı çökmez.',
  },
  {
    title: 'Kara liste',
    body: 'Çıkmak isteyen ya da elle işaretlenen numaralar bir daha hiçbir kampanyaya dahil edilmez.',
  },
]

const PLANS = [
  {
    name: 'Deneme',
    price: '0 TL',
    note: '7 gün',
    lines: '1 hat',
    daily: 'Günde 50 mesaj',
    features: ['Kredi kartı istenmez', 'Tüm özellikler açık', 'İstediğiniz an biter'],
    cta: 'Ücretsiz başla',
    featured: false,
  },
  {
    name: 'Büyüme',
    price: '1.290 TL',
    note: 'aylık',
    lines: '3 hat',
    daily: 'Günde 750 mesaj',
    features: [
      'Görsel üretici dahil',
      'Sınırsız kişi listesi',
      'Canlı kampanya takibi',
      'Öncelikli destek',
    ],
    cta: 'Başlayalım',
    featured: true,
  },
  {
    name: 'Ajans',
    price: '3.490 TL',
    note: 'aylık',
    lines: '10 hat',
    daily: 'Günde 2.500 mesaj',
    features: ['Çoklu müşteri yönetimi', 'Marka kiti başına şablon', 'Detaylı raporlama'],
    cta: 'İletişime geç',
    featured: false,
  },
]

const FAQ = [
  {
    q: 'Hesabım banlanır mı?',
    a: 'Risk sıfır değil ve bunu gizlemiyoruz. Resmi WhatsApp Business API kullanmadığımız için gönderim sizin kendi hattınızdan çıkıyor. Yaptığımız şey riski yönetmek: numaraları önceden doğruluyoruz, WhatsApp\u2019ın tanıdığı kotayı okuyoruz, yeni hattı kademeli ısıtıyoruz, gönderim aralıklarını rastgeleleştiriyoruz ve ilk kısıt sinyalinde duruyoruz. Kotayı zorlayan, alakasız listeye pazarlama yapan hesap yine de engellenebilir.',
  },
  {
    q: 'Gerçekten sınırsız numara gönderebilir miyim?',
    a: 'Liste tarafında evet, kaç numara yüklerseniz yükleyin taşırız. Gönderim hızında hayır: bir hat günde en fazla 250 mesaj atar ve bu bizim değil WhatsApp\u2019ın koyduğu bir sınır. 10.000 kişiye ulaşmak 3 hatla yaklaşık iki hafta, 40 hatla bir gün sürer. "Sınırsız gönderim" vaat eden her panel ya bunu bilmiyordur ya da hattınızı yakmayı göze almıştır.',
  },
  {
    q: 'Resmi WhatsApp Business API\u2019den farkı ne?',
    a: 'Resmi API\u2019de her pazarlama konuşması için Meta\u2019ya ücret ödersiniz (Türkiye için yaklaşık 0,087 dolar) ve gönderdiğiniz her şablonun önceden onaylanması gerekir; karşılığında hesap güvendedir. Bizde mesaj başına ücret ve şablon onayı yok, maliyet sabit; karşılığında risk sizin hattınızda. Aylık hacminiz yüksekse ve marka riskiniz büyükse resmi API daha doğru tercih.',
  },
  {
    q: 'KVKK açısından durum ne?',
    a: 'Onay vermemiş kişilere ticari elektronik ileti göndermek Türkiye\u2019de yasal risk taşır ve bu sorumluluk gönderen tarafa, yani size ait. Panel size çıkma taleplerini işaretleyebileceğiniz kara liste ve kayıt tutma imkanı veriyor, ama izinli liste kullanmak sizin sorumluluğunuzda.',
  },
  {
    q: 'Bilgisayarımı kapatırsam gönderim durur mu?',
    a: 'Hayır. WhatsApp oturumları ve kampanya motoru sunucuda çalışır, paneli yalnızca izlemek ve yönetmek için açarsınız. Paneli kapatsanız da gönderim kaldığı yerden devam eder; tekrar açtığınızda anlık durumu görürsünüz.',
  },
  {
    q: 'Hat kısıt alırsa ne oluyor?',
    a: 'O hat otomatik olarak duraklatılır ve panelde kilit sebebiyle gösterilir. Kampanya varsa diğer hatlardan devam eder. Kilit geçiciyse süresi bitince hat kendiliğinden geri döner.',
  },
]

export default function Landing() {
  return (
    <>
      {/* 1 — Hero */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] md:items-center md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-hairline-strong bg-surface px-2.5 py-1 text-[11.5px] text-ink-muted">
              <span className="size-1.5 rounded-full bg-accent" />
              Kendi hatlarınızdan, kendi sunucunuzda
            </span>

            <h1 className="mt-5 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[52px]">
              Toplu WhatsApp kampanyası, hattı yakmadan.
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-muted">
              Hatlarınızı QR ile bağlayın, listenizi yükleyin, mesajı ve görseli
              hazırlayın. {BRAND_NAME} gönderimi WhatsApp&apos;ın gerçek limitleri
              içinde, arka planda yürütür.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                href="/giris?mod=kayit"
                className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
              >
                7 gün ücretsiz dene
              </Link>
              <a
                href="#nasil"
                className="inline-flex h-9 items-center rounded-md border border-hairline-strong bg-surface-raised px-4 text-[13px] font-medium transition-colors hover:border-ink-faint"
              >
                Nasıl çalışır
              </a>
            </div>

            <p className="mt-3 text-[11.5px] text-ink-faint">
              Kredi kartı gerekmez &middot; Kurulum yok &middot; İstediğiniz an biter
            </p>
          </div>

          <HeroPanel />
        </div>
      </section>

      {/* 2 — Kapasite hesap makinesi */}
      <section id="kapasite" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-7 max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Önce şu soruyu netleştirelim: kaç mesaj atabilirsiniz?
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Çoğu panel bunu satış sonrasına saklar. Biz başa koyuyoruz, çünkü
              beklentiyi doğru kurmak hem sizin hem hatlarınızın lehine.
            </p>
          </div>

          <CapacityCalculator />
        </div>
      </section>

      {/* 3 — Nasıl çalışır */}
      <section id="nasil" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
            Üç adımda yayındasınız
          </h2>

          <div className="mt-8 grid gap-px overflow-hidden rounded-[10px] border border-hairline bg-hairline md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-surface p-6">
                <span className="tabular font-mono text-[11.5px] text-accent">
                  {step.n}
                </span>
                <h3 className="mt-3 text-[14.5px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
                  {step.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Ban önleme */}
      <section id="guvenlik" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Asıl iş, mesajı göndermek değil, hattı ayakta tutmak
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Toplu mesaj göndermek teknik olarak kolay. Zor olan, üçüncü
              kampanyadan sonra hattın hala çalışıyor olması. {BRAND_NAME}&apos;nun
              yaptığı iş büyük ölçüde bu.
            </p>
          </div>

          <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY.map((item) => (
              <div key={item.title} className="border-t border-hairline pt-4">
                <h3 className="text-[13.5px] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5 — Çoklu hat */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Kapasiteyi hat sayısıyla büyütürsünüz
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Tek hattan daha hızlı göndermeye çalışmak çalışmaz. Bunun yerine
              birden fazla hat bağlarsınız; {BRAND_NAME} kampanyayı hatlar arasında
              dağıtır, her hattın kendi kotasını ayrı takip eder ve biri kısıt
              alırsa diğerlerinden devam eder.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {[
                'Tek panelden istediğiniz kadar hat',
                'Hat başına ayrı günlük kota ve canlı durum',
                'Bir hat düşünce kampanya durmaz',
                'Oturumlar sunucuda; panel kapalıyken de bağlı',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[13px]">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" />
                  <span className="text-ink-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[10px] border border-hairline bg-surface p-6">
            <p className="text-[12px] font-medium text-ink-muted">
              3 hatlı bir kampanyanın dağılımı
            </p>
            <div className="mt-4 flex flex-col gap-3.5">
              {[
                { name: 'Satış hattı', sent: 250, tone: 'bg-accent' },
                { name: 'Destek hattı', sent: 250, tone: 'bg-accent' },
                { name: 'Kampanya hattı', sent: 120, tone: 'bg-warn' },
              ].map((line) => (
                <div key={line.name}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[12.5px]">{line.name}</span>
                    <span className="tabular text-[11.5px] text-ink-faint">
                      {line.sent} / 250
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-hairline">
                    <div
                      className={`h-full rounded-full ${line.tone}`}
                      style={{ width: `${(line.sent / 250) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-hairline pt-4 text-[11.5px] text-ink-faint">
              Üçüncü hat henüz ısınma döneminde, o yüzden tavanı düşük. Kampanya
              yine de günde 620 mesajla ilerliyor.
            </p>
          </div>
        </div>
      </section>

      {/* 6 — Fiyatlar */}
      <section id="fiyatlar" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Mesaj başına ücret yok
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Resmi API üzerinden çalışan panellerde her pazarlama mesajı ayrıca
              faturalanır. Biz kendi hattınızı kullandığımız için sabit ücret
              dışında bir maliyet çıkmıyor. Paketleri ayıran tek şey hat sayısı ve
              günlük kapasite.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`flex flex-col rounded-[10px] border bg-surface p-5 ${
                  plan.featured ? 'border-accent/40' : 'border-hairline'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-[13.5px] font-semibold">{plan.name}</h3>
                  {plan.featured ? (
                    <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[10.5px] font-medium text-accent">
                      En çok seçilen
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="tabular text-[26px] font-semibold leading-none">
                    {plan.price}
                  </span>
                  <span className="text-[12px] text-ink-faint">{plan.note}</span>
                </div>

                <div className="mt-4 flex gap-4 border-y border-hairline py-3">
                  <div>
                    <p className="text-[13px] font-medium">{plan.lines}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">{plan.daily}</p>
                  </div>
                </div>

                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-[12.5px]">
                      <span className="mt-[7px] size-1 shrink-0 rounded-full bg-ink-faint" />
                      <span className="text-ink-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/giris?mod=kayit"
                  className={`mt-5 inline-flex h-9 items-center justify-center rounded-md text-[13px] font-medium transition-colors ${
                    plan.featured
                      ? 'bg-accent text-accent-ink hover:bg-accent-dim'
                      : 'border border-hairline-strong bg-surface-raised hover:border-ink-faint'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7 — SSS */}
      <section id="sss" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-3xl px-5 py-16">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
            Sık sorulanlar
          </h2>

          <div className="mt-7 flex flex-col">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[13.5px] font-medium transition-colors hover:text-accent">
                  {item.q}
                  <span className="shrink-0 text-ink-faint transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 pr-8 text-[13px] leading-relaxed text-ink-muted">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* 8 — Kapanış */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-[28px] font-semibold tracking-[-0.025em]">
            İlk hattınızı beş dakikada bağlayın
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-ink-muted">
            Deneme sürümü tam özellikli. Kredi kartı istemiyoruz, otomatik
            yenileme yok.
          </p>
          <Link
            href="/giris?mod=kayit"
            className="mt-7 inline-flex h-9 items-center rounded-md bg-accent px-5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
          >
            Ücretsiz başla
          </Link>
        </div>
      </section>
    </>
  )
}
