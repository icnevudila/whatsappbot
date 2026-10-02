'use client'

import { useState } from 'react'
import Image from 'next/image'
import {
  Sparkles,
  Send,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

const WORKFLOW_STEPS = [
  {
    step: '01',
    badge: '1. Adım: Kreatif & Mesaj',
    title: 'Ürününüzü Ekleyin, Tanıtımınız Hazırlansın',
    subtitle: 'Fotoğraf yükleyin, saniyeler içinde etkileyici dikey video ve mesaj metniniz hazır olsun.',
    points: [
      'Ürününüzün fotoğrafını sisteme yükleyin',
      'Yapay zeka ile arka planı temizlenmiş profesyonel dikey reklam hazırlansın',
      'Teklif veya kampanya mesajınızı belirleyin',
    ],
    highlight: 'Ajans veya tasarımcı aramaya son',
    image: '/landing/infographics/05-kreatif-studyosu-chatgpt-4-3.png',
    statBadge: 'Hazırlık Süresi: ~30 saniye',
  },
  {
    step: '02',
    badge: '2. Adım: Akıllı Dağıtım',
    title: 'Mesajlarınızı Güvenle Gönderin',
    subtitle: 'Bağlı WhatsApp hatlarınız üzerinden mesajlar zamana yayılarak müşterilerinize ulaştırılır.',
    points: [
      'WhatsApp Business numaranızı QR kodla bağlayın',
      'Gönderimler hatlar arasında akıllıca paylaştırılarak güvenle ilerler',
      'Tek bir numaraya yük bindirmeden kesintisiz iletişim sağlanır',
    ],
    highlight: 'Akıllı hat rotası ve otomatik koruma',
    image: '/landing/infographics/03-coklu-hat-chatgpt-4-3.png',
    statBadge: 'Çoklu Hat Akıllı Dağıtımı',
  },
  {
    step: '03',
    badge: '3. Adım: Satış & Gelen Kutusu',
    title: 'Gelen Siparişleri Tek Ekranda Karşılayın',
    subtitle: 'Müşterilerinizden gelen sorular ve sipariş talepleri ortak ekranda toplanır, anında yanıtlayın.',
    points: [
      'Telefon aramaya, birden fazla tarayıcı açmaya gerek yok',
      'Tüm müşteri yanıtları tek gelen kutusunda anında görünür',
      'Fiyat, randevu ve siparişleri ekibinizle birlikte kolayca yönetin',
    ],
    highlight: 'Müşteriyi bekletmeden anında satışa dönüştürün',
    image: '/landing/infographics/04-ortak-inbox-chatgpt-16-9.png',
    statBadge: 'İlk Yanıt Süresi: < 45 saniye',
  },
]

export function HowItWorksSimple() {
  const [activeStep, setActiveStep] = useState(0)
  const current = WORKFLOW_STEPS[activeStep]

  return (
    <section className="relative w-full bg-[#f8faf8] py-20 sm:py-28 border-y border-emerald-950/10 overflow-hidden">
      {/* Background Decor */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.06),transparent_70%)] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            3 Kolay Adımda Mesajify
          </span>
          <h2 className="mt-5 text-[clamp(32px,4.8vw,60px)] font-bold tracking-tight text-slate-900 leading-[1.12]">
            Nasıl Çalışır? <br />
            <span className="text-emerald-700">Karmaşık terimler yok. Sadece 3 adım.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Teknik bilgiye, karmaşık tablolara veya kafa karıştırıcı süreçlere gerek yok. Ürününüzü ekleyin, mesajınızı gönderin ve gelen siparişleri tek panelden yönetin.
          </p>
        </div>

        {/* 3 Step Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-12">
          {WORKFLOW_STEPS.map((s, idx) => {
            const isActive = idx === activeStep
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`text-left p-6 sm:p-7 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-white border-emerald-500/50 shadow-xl shadow-emerald-900/5 ring-2 ring-emerald-500/20'
                    : 'bg-white/70 hover:bg-white border-slate-200/80 shadow-xs hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      isActive
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.step}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">{s.highlight}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 leading-snug">
                  {s.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {s.subtitle}
                </p>
              </button>
            )
          })}
        </div>

        {/* Active Step Detailed Showcase View */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-10 shadow-xl shadow-slate-900/5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Explanation Details */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200/60 px-3 py-1 text-xs font-bold text-emerald-800">
                {current.badge}
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
                {current.title}
              </h3>

              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {current.subtitle}
              </p>

              {/* Bullet Points */}
              <div className="space-y-3 pt-2">
                {current.points.map((pt, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 font-medium">{pt}</span>
                  </div>
                ))}
              </div>

              {/* CTA link to action */}
              <div className="pt-4 flex items-center gap-4">
                <a
                  href="https://app.mesajify.com/giris"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Şimdi Panelde Dene <ArrowRight className="h-4 w-4" />
                </a>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500 font-medium">{current.statBadge}</span>
              </div>
            </div>

            {/* Right Interactive Visual Frame */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-2xl bg-slate-900 group">
                <Image
                  src={current.image}
                  alt={current.title}
                  fill
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                  priority
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white/90 backdrop-blur-md bg-black/60 px-4 py-2.5 rounded-xl border border-white/10">
                  <span className="font-medium truncate pr-2">{current.title}</span>
                  <span className="text-emerald-400 font-bold whitespace-nowrap">{current.statBadge}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Guarantee Strip */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center sm:text-left pt-8 border-t border-slate-200/60">
          <div className="flex items-center sm:items-start gap-3 justify-center sm:justify-start">
            <div className="h-10 w-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Karmaşık Kurulum Yok</h4>
              <p className="text-xs text-slate-500 mt-0.5">Dakikalar içinde ilk tanıtımınızı yayına alın.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3 justify-center sm:justify-start">
            <div className="h-10 w-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Tüm Hatlar Tek Ekranda</h4>
              <p className="text-xs text-slate-500 mt-0.5">WhatsApp Web sekmeleri arasında kaybolmayın.</p>
            </div>
          </div>

          <div className="flex items-center sm:items-start gap-3 justify-center sm:justify-start">
            <div className="h-10 w-10 rounded-xl bg-emerald-100/80 text-emerald-800 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">Güvenli & Kontrollü</h4>
              <p className="text-xs text-slate-500 mt-0.5">Akıllı hat dengelemesi ile güvenli gönderim.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
