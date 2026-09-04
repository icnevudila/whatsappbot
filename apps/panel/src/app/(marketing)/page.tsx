import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/components/brand'
import { CapacityCalculator } from './capacity-calculator'
import { HeroPanel } from './hero-panel'

export const metadata: Metadata = {
  // absolute: kok layout'taki "%s · Filo" sablonu burada isim tekrarina yol aciyor.
  title: { absolute: `${BRAND_NAME} — Coklu WhatsApp hattindan toplu kampanya gonderimi` },
  description:
    'Kendi WhatsApp hatlarinizi baglayin, kisi listenizi yukleyin, hatti yakmayan hizda toplu kampanya gonderin. Numara dogrulama, isindirma ve otomatik durdurma dahil.',
}

const STEPS = [
  {
    n: '01',
    title: 'Hatlarinizi baglayin',
    body: 'Panelde QR kodu cikar, telefonunuzdan okutursunuz. Ayni anda kac hat isterseniz. Oturumlar sunucuda tutulur, panel kapaliyken de bagli kalir.',
  },
  {
    n: '02',
    title: 'Kisileri yukleyin',
    body: 'CSV yükleyin ya da numaraları doğrudan yapıştırın. Ülke koduna çevrilir ve WhatsApp’ta kayıtlı olup olmadığı kontrol edilir.',
  },
  {
    n: '03',
    title: 'Kampanyayi baslatin',
    body: 'Mesaji yazin, gorseli ekleyin, hatlari secin. Gerisi arka planda calisir; siz paneli kapatsaniz da gonderim surer.',
  },
]

const SAFETY = [
  {
    title: 'Numara dogrulama kapisi',
    body: 'Gönderimden önce her numara WhatsApp’ta kayıtlı mı diye kontrol edilir. Kayıtsız numaraya denemek kısıt almanın en hızlı yolu.',
  },
  {
    title: 'Gercek kotanin okunmasi',
    body: 'WhatsApp’ın hesabınıza tanıdığı yeni sohbet kotasını ve varsa geçici kilidi doğrudan kaynaktan okuyup panelde gösteriyoruz. Tahmin yok.',
  },
  {
    title: 'Isindirma egrisi',
    body: 'Yeni hat ilk gun 10, birinci hafta 120, ikinci haftadan sonra gunde 250 mesaja cikar. Bu tavan panelden asilamaz.',
  },
  {
    title: 'Insani gonderim araligi',
    body: 'Mesajlar arasinda rastgele bekleme var. Sabit araliklarla atilan mesaj, otomasyonun en kolay yakalanan imzasi.',
  },
  {
    title: 'Otomatik durdurma',
    body: 'Hat kisit sinyali verdigi anda kampanya o hattan durur, digerlerinden devam eder. Kampanyanin tamami cokmez.',
  },
  {
    title: 'Kara liste',
    body: 'Cikmak isteyen ya da elle isaretlenen numaralar bir daha hicbir kampanyaya dahil edilmez.',
  },
]

const PLANS = [
  {
    name: 'Deneme',
    price: '0 TL',
    note: '7 gun',
    lines: '1 hat',
    daily: 'Gunde 50 mesaj',
    features: ['Kredi karti istenmez', 'Tum ozellikler acik', 'Istediginiz an biter'],
    cta: 'Ucretsiz basla',
    featured: false,
  },
  {
    name: 'Buyume',
    price: '1.290 TL',
    note: 'aylik',
    lines: '3 hat',
    daily: 'Gunde 750 mesaj',
    features: [
      'Gorsel uretici dahil',
      'Sinirsiz kisi listesi',
      'Canli kampanya takibi',
      'Oncelikli destek',
    ],
    cta: 'Baslayalim',
    featured: true,
  },
  {
    name: 'Ajans',
    price: '3.490 TL',
    note: 'aylik',
    lines: '10 hat',
    daily: 'Gunde 2.500 mesaj',
    features: ['Coklu musteri yonetimi', 'Marka kiti basina sablon', 'Detayli raporlama'],
    cta: 'Iletisime gec',
    featured: false,
  },
]

const FAQ = [
  {
    q: 'Hesabim banlanir mi?',
    a: 'Risk sifir degil ve bunu gizlemiyoruz. Resmi WhatsApp Business API kullanmadigimiz icin gonderim sizin kendi hattinizdan cikiyor. Yaptigimiz sey riski yonetmek: numaralari onceden dogruluyoruz, WhatsApp\u2019in tanidigi kotayi okuyoruz, yeni hatti kademeli isitiyoruz, gonderim araliklarini rastgeleleştiriyoruz ve ilk kisit sinyalinde duruyoruz. Kotayi zorlayan, alakasiz listeye pazarlama yapan hesap yine de engellenebilir.',
  },
  {
    q: 'Gercekten sinirsiz numara gonderebilir miyim?',
    a: 'Liste tarafinda evet, kac numara yuklerseniz yukleyin tasiriz. Gonderim hizinda hayir: bir hat gunde en fazla 250 mesaj atar ve bu bizim degil WhatsApp\u2019in koydugu bir sinir. 10.000 kisiye ulasmak 3 hatla yaklasik iki hafta, 40 hatla bir gun surer. "Sinirsiz gonderim" vaat eden her panel ya bunu bilmiyordur ya da hattinizi yakmayi goze almistir.',
  },
  {
    q: 'Resmi WhatsApp Business API\u2019den farki ne?',
    a: 'Resmi API\u2019de her pazarlama konusmasi icin Meta\u2019ya ucret odersiniz (Turkiye icin yaklasik 0,087 dolar) ve gonderdiginiz her sablonun onceden onaylanmasi gerekir; karsiliginda hesap guvendedir. Bizde mesaj basina ucret ve sablon onayi yok, maliyet sabit; karsiliginda risk sizin hattinizda. Aylik hacminiz yuksekse ve marka riskiniz buyukse resmi API daha dogru tercih.',
  },
  {
    q: 'KVKK acisindan durum ne?',
    a: 'Onay vermemis kisilere ticari elektronik ileti gondermek Turkiye\u2019de yasal risk tasir ve bu sorumluluk gonderen tarafa, yani size ait. Panel size cikma taleplerini isaretleyebileceginiz kara liste ve kayit tutma imkani veriyor, ama izinli liste kullanmak sizin sorumlulugunuzda.',
  },
  {
    q: 'Bilgisayarimi kapatirsam gonderim durur mu?',
    a: 'Hayir. WhatsApp oturumlari ve kampanya motoru sunucuda calisir, paneli yalnizca izlemek ve yonetmek icin acarsiniz. Paneli kapatsaniz da gonderim kaldigi yerden devam eder; tekrar actiginizda anlik durumu gorursunuz.',
  },
  {
    q: 'Hat kisit alirsa ne oluyor?',
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
              Kendi hatlarinizdan, kendi sunucunuzda
            </span>

            <h1 className="mt-5 text-[38px] font-semibold leading-[1.08] tracking-[-0.03em] md:text-[52px]">
              Toplu WhatsApp kampanyasi, hatti yakmadan.
            </h1>

            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-muted">
              Hatlarinizi QR ile baglayin, listenizi yukleyin, mesaji ve gorseli
              hazirlayin. {BRAND_NAME} gonderimi WhatsApp&apos;in gercek limitleri
              icinde, arka planda yurutur.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-2.5">
              <Link
                href="/giris?mod=kayit"
                className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
              >
                7 gun ucretsiz dene
              </Link>
              <a
                href="#nasil"
                className="inline-flex h-9 items-center rounded-md border border-hairline-strong bg-surface-raised px-4 text-[13px] font-medium transition-colors hover:border-ink-faint"
              >
                Nasil calisir
              </a>
            </div>

            <p className="mt-3 text-[11.5px] text-ink-faint">
              Kredi karti gerekmez &middot; Kurulum yok &middot; Istediginiz an biter
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
              Once su soruyu netlestirelim: kac mesaj atabilirsiniz?
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Cogu panel bunu satis sonrasina saklar. Biz basa koyuyoruz, cunku
              beklentiyi dogru kurmak hem sizin hem hatlarinizin lehine.
            </p>
          </div>

          <CapacityCalculator />
        </div>
      </section>

      {/* 3 — Nasil calisir */}
      <section id="nasil" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
            Uc adimda yayindasiniz
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

      {/* 4 — Ban onleme */}
      <section id="guvenlik" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Asil is, mesaji gondermek degil, hatti ayakta tutmak
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Toplu mesaj gondermek teknik olarak kolay. Zor olan, ucuncu
              kampanyadan sonra hattin hala calisiyor olmasi. {BRAND_NAME}&apos;nun
              yaptigi is buyuk olcude bu.
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

      {/* 5 — Coklu hat */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Kapasiteyi hat sayisiyla buyutursunuz
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Tek hattan daha hizli gondermeye calismak calismaz. Bunun yerine
              birden fazla hat baglarsiniz; {BRAND_NAME} kampanyayi hatlar arasinda
              dagitir, her hattin kendi kotasini ayri takip eder ve biri kisit
              alirsa digerlerinden devam eder.
            </p>
            <ul className="mt-5 flex flex-col gap-2.5">
              {[
                'Tek panelden istediginiz kadar hat',
                'Hat basina ayri gunluk kota ve canli durum',
                'Bir hat dusunce kampanya durmaz',
                'Oturumlar sunucuda; panel kapaliyken de bagli',
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
              3 hatli bir kampanyanin dagilimi
            </p>
            <div className="mt-4 flex flex-col gap-3.5">
              {[
                { name: 'Satis hatti', sent: 250, tone: 'bg-accent' },
                { name: 'Destek hatti', sent: 250, tone: 'bg-accent' },
                { name: 'Kampanya hatti', sent: 120, tone: 'bg-warn' },
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
              Ucuncu hat henuz isinma doneminde, o yuzden tavani dusuk. Kampanya
              yine de gunde 620 mesajla ilerliyor.
            </p>
          </div>
        </div>
      </section>

      {/* 6 — Fiyatlar */}
      <section id="fiyatlar" className="scroll-mt-16 border-b border-hairline">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="max-w-2xl">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em]">
              Mesaj basina ucret yok
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-muted">
              Resmi API uzerinden calisan panellerde her pazarlama mesaji ayrica
              faturalanir. Biz kendi hattinizi kullandigimiz icin sabit ucret
              disinda bir maliyet cikmiyor. Paketleri ayiran tek sey hat sayisi ve
              gunluk kapasite.
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
                      En cok secilen
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
            Sik sorulanlar
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

      {/* 8 — Kapanis */}
      <section>
        <div className="mx-auto max-w-6xl px-5 py-20 text-center">
          <h2 className="text-[28px] font-semibold tracking-[-0.025em]">
            Ilk hattinizi bes dakikada baglayin
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14px] text-ink-muted">
            Deneme surumu tam ozellikli. Kredi karti istemiyoruz, otomatik
            yenileme yok.
          </p>
          <Link
            href="/giris?mod=kayit"
            className="mt-7 inline-flex h-9 items-center rounded-md bg-accent px-5 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
          >
            Ucretsiz basla
          </Link>
        </div>
      </section>
    </>
  )
}
