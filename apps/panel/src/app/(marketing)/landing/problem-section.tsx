'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { ProductFrame } from '../product-frame'
import { ScrollReveal } from './scroll-reveal'

const PROBLEMS = [
  {
    title: 'Hattı yakan hız',
    body: 'Sabit tempoda binlerce mesaj atmak hesabı kısıtlatır. “Sınırsız gönderim” vaadi çoğu zaman ban demektir.',
  },
  {
    title: 'Kayıtsız numaraya deneme',
    body: 'Kayıtlı olmayan numaraya basmak hem kotayı hem şikayet riskini yükseltir.',
  },
  {
    title: 'Panel kapanınca duran gönderim',
    body: 'Bilgisayarınız kapalıysa kampanya da duruyorsa operasyon ölçeklenemez.',
  },
  {
    title: 'Yanıtları kaçırmak',
    body: 'Kampanyadan gelen “ilgileniyorum” veya “çık” cevapları dağılırsa satış ve KVKK riski büyür.',
  },
] as const

const SOLUTIONS = [
  {
    title: 'Isındırma ve rastgele aralık',
    body: 'Yeni hat kademeli tavanla açılır. Mesajlar arasında insanî bekleme vardır; kota panoda canlı görünür.',
    image: '/landing/hesaplar.png',
    frame: 'Hesaplar · hat kotası',
  },
  {
    title: 'Gönderimden önce doğrula',
    body: 'Listedeki numaralar kayıtlı mı diye işaretlenir. Kayıtsızlara kampanya gitmez.',
    image: '/landing/kisiler.png',
    frame: 'Kişiler · numara doğrulama',
  },
  {
    title: 'Sunucuda çalışan motor',
    body: 'Oturum ve kampanya arka planda sürer. Paneli kapatsanız da gönderim devam eder.',
    image: '/landing/durum.png',
    frame: 'Durum · canlı izleme',
  },
  {
    title: 'Yanıtlar ve kara liste',
    body: 'Gelen cevapları tek yerden okuyun. Çıkmak isteyeni bir tıkla kara listeye alın.',
    image: '/landing/kara-liste.png',
    frame: 'Kara liste · çıkış talepleri',
  },
] as const

export function ProblemSection() {
  const [active, setActive] = useState(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        const idx = Number(visible[0]?.target.getAttribute('data-index'))
        if (!Number.isNaN(idx)) setActive(idx)
      },
      { rootMargin: '-20% 0px -45% 0px', threshold: [0.25, 0.5, 0.75] },
    )
    refs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const solution = SOLUTIONS[active]!

  return (
    <section id="sorun" className="scroll-mt-16 border-b border-hairline bg-canvas">
      <div className="mx-auto max-w-6xl px-5 py-[clamp(4.5rem,10vw,7.5rem)]">
        <ScrollReveal>
          <p className="mb-2 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
            Sorun → çözüm
          </p>
          <h2 className="max-w-xl text-[24px] font-semibold tracking-[-0.02em]">
            Toplu mesaj panellerinin takıldığı yerler
          </h2>
          <p className="mt-3 max-w-[40rem] text-[14px] leading-relaxed text-ink-muted">
            Filo gönderimi hızlandırmaktan çok hattı ayakta tutmaya odaklanır. Kaydırdıkça her
            probleme karşılık gelen ekranı görün.
          </p>
        </ScrollReveal>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-start">
          <div className="space-y-3">
            {PROBLEMS.map((item, index) => {
              const on = index === active
              return (
                <button
                  key={item.title}
                  type="button"
                  data-index={index}
                  ref={(el) => {
                    refs.current[index] = el
                  }}
                  onClick={() => setActive(index)}
                  className={`w-full rounded-[var(--radius-sm)] border px-4 py-4 text-left transition-colors ${
                    on
                      ? 'border-accent/30 bg-accent-soft'
                      : 'border-hairline bg-surface hover:bg-surface-raised'
                  }`}
                >
                  <p className="text-[13.5px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{item.body}</p>
                </button>
              )
            })}
          </div>

          <div className="lg:sticky lg:top-24">
            <div className="rounded-[14px] border border-hairline bg-surface p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-accent">
                Filo’da çözüm
              </p>
              <h3 className="mt-2 text-[18px] font-semibold tracking-[-0.02em]">{solution.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{solution.body}</p>
              <div className="mt-5">
                <ProductFrame caption={solution.frame}>
                  <div className="relative aspect-[16/10] overflow-hidden bg-canvas">
                    {SOLUTIONS.map((item, idx) => (
                      <div
                        key={item.image}
                        className={`absolute inset-0 transition-opacity duration-500 ${
                          idx === active ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <Image
                          src={item.image}
                          alt={item.title}
                          fill
                          className="object-cover object-top"
                          sizes="(max-width: 1024px) 100vw, 560px"
                        />
                      </div>
                    ))}
                  </div>
                </ProductFrame>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
