import type { Metadata } from 'next'
import Link from 'next/link'
import { PLAN_LABELS, PLAN_QUOTAS, type PlanId } from '@wa/shared'
import { BRAND_NAME, LogoMark } from '@/components/brand'
import { CapacityCalculator } from './capacity-calculator'
import { HeroPanel } from './hero-panel'
import { DayInOps } from './landing/day-in-ops'
import { FinalCta } from './landing/final-cta'
import { ProblemSection } from './landing/problem-section'
import { LandingScrollTop } from './landing/scroll-top'
import { SocialProofStrip } from './landing/social-proof'
import { StickyCta } from './landing/sticky-cta'
import { WallOfLove } from './landing/wall-of-love'
import { ProductShowcase } from './product-showcase'
import './landing/landing.css'

export const metadata: Metadata = {
  title: { absolute: `${BRAND_NAME} — Çoklu hattan toplu kampanya gönderimi` },
  description:
    'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin. Numara doğrulama, ısındırma ve otomatik durdurma dahil.',
  openGraph: {
    title: `${BRAND_NAME} — Çoklu hattan toplu kampanya gönderimi`,
    description:
      'Kendi hatlarınızı bağlayın, kişi listenizi yükleyin, hattı koruyan hızda toplu kampanya gönderin.',
  },
}

const STEPS = [
  {
    n: '01',
    title: 'Hatlarınızı bağlayın',
    body: 'Panelde QR kodu açılır, telefonunuzdan okutursunuz. İstediğiniz kadar hat ekleyebilirsiniz. Oturumlar sunucuda tutulur; panel kapalıyken de bağlı kalır.',
  },
  {
    n: '02',
    title: 'Kişileri yükleyin',
    body: 'CSV yükleyin veya numaraları yapıştırın. Ülke koduna çevrilir ve kayıtlı olup olmadığı kontrol edilir.',
  },
  {
    n: '03',
    title: 'Kampanyayı başlatın',
    body: 'Mesajı yazın, görseli ekleyin, hatları seçin. Gönderim arka planda sürer; paneli kapatsanız da devam eder.',
  },
]

const SAFETY = [
  {
    title: 'Numara doğrulama',
    body: 'Gönderimden önce her numara kayıtlı mı diye kontrol edilir. Kayıtsız numaraya denemek kısıt almanın en hızlı yoludur.',
  },
  {
    title: 'Gerçek kota okuması',
    body: 'Hesabınıza tanınan yeni sohbet kotasını ve varsa geçici kilidi kaynaktan okuyup panelde gösteririz. Tahmin yok.',
  },
  {
    title: 'Isındırma eğrisi',
    body: 'Yeni hat ilk gün 10, birinci hafta 120, ikinci haftadan sonra günde 250 mesaja çıkar. Bu tavan panelden aşılamaz.',
  },
  {
    title: 'İnsanî gönderim aralığı',
    body: 'Mesajlar arasında rastgele bekleme vardır. Sabit aralıkla atılan mesaj, otomasyonun en kolay yakalanan imzasıdır.',
  },
  {
    title: 'Otomatik durdurma',
    body: 'Hat kısıt sinyali verdiğinde kampanya o hattan durur, diğerlerinden devam eder. Tüm kampanya çökmez.',
  },
  {
    title: 'Kara liste',
    body: 'Çıkmak isteyen veya elle işaretlenen numaralar bir daha hiçbir kampanyaya dahil edilmez.',
  },
]

type LandingPlan = {
  id: PlanId
  price: string
  note: string
  daily: string
  features: string[]
  cta: string
  featured: boolean
}

const PLANS: LandingPlan[] = [
  {
    id: 'free',
    price: '0 TL',
    note: '7 gün',
    daily: 'Günde 50 mesaj',
    features: ['Kredi kartı istenmez', 'Tüm özellikler açık', 'İstediğiniz an biter'],
    cta: 'Ücretsiz dene',
    featured: false,
  },
  {
    id: 'starter',
    price: '890 TL',
    note: 'aylık',
    daily: 'Günde ~750 mesaj',
    features: ['Sınırsız kişi listesi', 'Canlı kampanya takibi', 'Numara doğrulama'],
    cta: 'Ücretsiz dene',
    featured: false,
  },
  {
    id: 'pro',
    price: '1.290 TL',
    note: 'aylık',
    daily: 'Günde ~2.500 mesaj',
    features: [
      'Görsel üretici dahil',
      'Sınırsız kişi listesi',
      'Canlı kampanya takibi',
      'Öncelikli destek',
    ],
    cta: 'Ücretsiz dene',
    featured: true,
  },
  {
    id: 'enterprise',
    price: '3.490 TL',
    note: 'aylık',
    daily: 'Günde ~12.500 mesaj',
    features: ['Çoklu müşteri yönetimi', 'Marka kiti başına şablon', 'Detaylı raporlama'],
    cta: 'Ücretsiz dene',
    featured: false,
  },
]

const FAQ = [
  {
    q: 'Hesabım banlanır mı?',
    a: 'Risk sıfır değil; bunu gizlemiyoruz. Gönderim sizin kendi hattınızdan çıkar. Biz riski yönetiriz: numaraları önceden doğrularız, tanıdığınız kotayı okuruz, yeni hattı kademeli ısıtırız, aralıkları rastgeleleştiririz ve ilk kısıt sinyalinde dururuz. Kotayı zorlayan veya alakasız listeye yazan hesap yine de engellenebilir.',
  },
  {
    q: 'Gerçekten sınırsız numara gönderebilir miyim?',
    a: 'Liste tarafında evet; kaç numara yüklerseniz yükleyin taşırız. Gönderim hızında hayır: bir hat günde en fazla 250 mesaj atar. Bu bizim değil platformun sınırı. 10.000 kişiye ulaşmak 3 hatla yaklaşık iki hafta, 40 hatla bir gün sürer. “Sınırsız gönderim” vaat eden her panel ya bunu bilmiyordur ya da hattınızı yakmayı göze almıştır.',
  },
  {
    q: 'Resmi API ile farkı ne?',
    a: 'Resmi API’de her pazarlama konuşması için Meta’ya ücret ödersiniz ve şablonların önceden onaylanması gerekir; karşılığında hesap daha güvendedir. Bizde mesaj başına ücret ve şablon onayı yok, maliyet sabittir; risk sizin hattınızdadır. Hacminiz çok yüksekse ve marka riskiniz büyükse resmi API daha doğru tercih olabilir.',
  },
  {
    q: 'KVKK açısından durum ne?',
    a: 'Onay vermemiş kişilere ticari elektronik ileti göndermek Türkiye’de yasal risk taşır; sorumluluk gönderene aittir. Panel çıkma taleplerini işaretleyebileceğiniz kara liste ve kayıt tutma imkânı verir, ama izinli liste kullanmak sizin sorumluluğunuzdadır.',
  },
  {
    q: 'Bilgisayarımı kapatırsam gönderim durur mu?',
    a: 'Hayır. Oturumlar ve kampanya motoru sunucuda çalışır. Paneli yalnızca izlemek ve yönetmek için açarsınız. Kapatsanız da gönderim kaldığı yerden devam eder; tekrar açtığınızda güncel durumu görürsünüz.',
  },
  {
    q: 'Hat kısıt alırsa ne olur?',
    a: 'O hat otomatik duraklatılır ve panelde kilit sebebiyle gösterilir. Kampanya varsa diğer hatlardan devam eder. Kilit geçiciyse süresi bitince hat kendiliğinden geri döner.',
  },
]

export default function Landing() {
  return (
    <>
      {/* 1 — Hero */}
      <section
        data-landing-conversion-zone
        className="relative overflow-hidden bg-[var(--color-hero)] text-white"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(47,91,255,0.22),transparent_55%)]"
        />

        <div className="relative mx-auto grid min-h-[calc(100dvh-64px)] max-w-6xl md:min-h-[720px] md:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] md:items-stretch">
          <div className="flex flex-col justify-center px-5 py-14 md:py-20 md:pr-8">
            <div className="filo-fade-up inline-flex items-center gap-3">
              <LogoMark className="size-9 text-white md:size-11" />
              <span className="text-[36px] font-semibold tracking-[-0.04em] md:text-[48px]">
                {BRAND_NAME}
              </span>
            </div>

            <h1 className="filo-fade-up-delay mt-6 max-w-md text-[26px] font-semibold leading-[1.15] tracking-[-0.03em] text-white md:text-[34px]">
              Toplu kampanya gönderin,{' '}
              <span className="text-[#9db8f5]">hattınızı koruyun.</span>
            </h1>

            <p className="filo-fade-up-delay mt-4 max-w-md text-[15px] leading-relaxed text-white/75">
              Hatlarınızı QR ile bağlayın, listenizi yükleyin, mesajı hazırlayın. Gönderim gerçek
              limitler içinde, arka planda yürür.
            </p>

            <div className="filo-fade-up-delay-2 mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                href="/giris?mod=kayit"
                className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
              >
                7 gün ücretsiz dene
              </Link>
              <a
                href="#urun"
                className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-white/20 bg-white/5 px-4 text-[13px] font-medium text-white transition-colors hover:bg-white/10"
              >
                Ürünü gör
              </a>
            </div>

            <p className="filo-fade-up-delay-2 mt-3 text-[11.5px] text-white/45">
              Kredi kartı gerekmez · Kurulum yok · İstediğiniz an biter
            </p>
          </div>

          <HeroPanel />
        </div>
      </section>

      <SocialProofStrip />

      {/* Kapasite */}
      <section id="kapasite" className="scroll-mt-16 border-b border-hairline bg-canvas">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
          <div className="mb-7 max-w-2xl">
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Kapasite
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">
              Önce netleştirelim: günde kaç mesaj gönderebilirsiniz?
            </h2>
            <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">
              Çoğu panel bunu satış sonrasına saklar. Biz başa koyuyoruz; doğru beklenti hem sizin
              hem hatlarınızın lehine.
            </p>
          </div>
          <CapacityCalculator />
        </div>
      </section>

      <ProblemSection />

      {/* Nasıl çalışır */}
      <section id="nasil" className="scroll-mt-16 border-b border-hairline bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            Akış
          </p>
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Üç adımda yayına alırsınız</h2>
          <div className="mt-8 grid gap-px overflow-hidden border border-hairline bg-hairline md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-surface p-6">
                <span className="tabular font-mono text-[11.5px] text-accent">{step.n}</span>
                <h3 className="mt-3 text-[14.5px] font-semibold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ProductShowcase />

      <DayInOps />

      {/* Güvenlik */}
      <section id="guvenlik" className="scroll-mt-16 border-b border-hairline bg-accent-soft/40">
        <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
          <div className="max-w-2xl">
            <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
              Ban önleme
            </p>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">
              Asıl iş mesaj atmak değil, hattı ayakta tutmak
            </h2>
            <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">
              Toplu mesaj göndermek teknik olarak kolaydır. Zor olan, üçüncü kampanyadan sonra hattın
              hâlâ çalışıyor olmasıdır. {BRAND_NAME} büyük ölçüde bunu yapar.
            </p>
          </div>
          <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
            {SAFETY.map((item) => (
              <div key={item.title} className="border-t border-hairline pt-4">
                <h3 className="text-[13.5px] font-semibold">{item.title}</h3>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Çoklu hat */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">
              Kapasiteyi hat sayısıyla büyütün
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Tek hattı zorlamak işe yaramaz. Bunun yerine birden fazla hat bağlarsınız; {BRAND_NAME}{' '}
              kampanyayı hatlar arasında dağıtır, her hattın kotasını ayrı takip eder ve biri kısıt
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

          <div className="border border-hairline bg-surface p-6">
            <p className="text-[12px] font-medium text-ink-muted">3 hatlı bir kampanyanın dağılımı</p>
            <div className="mt-4 flex flex-col gap-3.5">
              {[
                { name: 'Satış hattı', sent: 250, tone: 'bg-accent' },
                { name: 'Destek hattı', sent: 250, tone: 'bg-accent' },
                { name: 'Kampanya hattı', sent: 120, tone: 'bg-warn' },
              ].map((line) => (
                <div key={line.name}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[12.5px]">{line.name}</span>
                    <span className="tabular text-[11.5px] text-ink-faint">{line.sent} / 250</span>
                  </div>
                  <div className="h-1.5 overflow-hidden bg-hairline">
                    <div
                      className={`h-full ${line.tone}`}
                      style={{ width: `${(line.sent / 250) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 border-t border-hairline pt-4 text-[11.5px] text-ink-faint">
              Üçüncü hat henüz ısınma döneminde olduğu için tavanı düşük. Kampanya yine de günde 620
              mesajla ilerliyor.
            </p>
          </div>
        </div>
      </section>

      <WallOfLove />

      {/* Fiyatlar */}
      <section id="fiyatlar" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="max-w-2xl">
            <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Mesaj başına ücret yok</h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Resmi API kullanan panellerde her pazarlama mesajı ayrıca faturalanır. Biz kendi
              hattınızı kullandığımız için sabit ücret dışında ek maliyet çıkmaz. Paketleri ayıran tek
              şey hat sayısı ve günlük kapasitedir. Fiyatlar bilgilendirme amaçlıdır; ödeme kayıttan
              sonra Ayarlar’dan yapılandırılır.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const quota = PLAN_QUOTAS[plan.id]
              return (
                <div
                  key={plan.id}
                  className={`flex flex-col border bg-surface p-5 ${
                    plan.featured ? 'border-accent/40' : 'border-hairline'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-[13.5px] font-semibold">{PLAN_LABELS[plan.id]}</h3>
                    {plan.featured ? (
                      <span className="text-[10.5px] font-medium text-accent">Önerilen</span>
                    ) : null}
                  </div>

                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="tabular text-[24px] font-semibold leading-none">
                      {plan.price}
                    </span>
                    <span className="text-[12px] text-ink-faint">{plan.note}</span>
                  </div>

                  <div className="mt-4 border-y border-hairline py-3">
                    <p className="text-[13px] font-medium">{quota.accounts} hat</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">{plan.daily}</p>
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      Aylık kota {quota.messages.toLocaleString('tr-TR')} mesaj
                    </p>
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
              )
            })}
          </div>
        </div>
      </section>

      {/* SSS */}
      <section id="sss" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-3xl px-5 py-14">
          <h2 className="text-[24px] font-semibold tracking-[-0.02em]">Sık sorulanlar</h2>
          <div className="mt-7 flex flex-col">
            {FAQ.map((item) => (
              <details key={item.q} className="group border-b border-hairline">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[13.5px] font-medium transition-colors hover:text-accent">
                  {item.q}
                  <span className="shrink-0 text-ink-faint transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="pb-4 pr-8 text-[13px] leading-relaxed text-ink-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <FinalCta />
      <StickyCta />
      <LandingScrollTop />
    </>
  )
}
