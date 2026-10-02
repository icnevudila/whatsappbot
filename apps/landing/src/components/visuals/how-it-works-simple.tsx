'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { CheckCircle2 } from 'lucide-react'

const STEP_DURATION_MS = 5000

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Kampanyanızı ve Mesajınızı Hazırlayın',
    subtitle: 'Tanıtmak istediğiniz görseli veya dikey videoyu ekleyin, kampanya mesajınızı belirleyin.',
    points: [
      'Tanıtım görselinizi veya dikey ürün videonuzu ekleyin',
      'Müşterilerinize iletilecek net kampanya metninizi belirleyin',
      'Gönderim yapacağınız hedef kitleyi veya müşteri listenizi seçin',
    ],
    image: '/landing/infographics/02-kampanya-hazirlik-chatgpt-16-9.png',
  },
  {
    step: '02',
    title: 'Mesajlarınızı Güvenle Gönderin',
    subtitle: 'Bağlı WhatsApp hatlarınız üzerinden mesajlar zamana yayılarak müşterilerinize ulaştırılır.',
    points: [
      'WhatsApp numaranızı QR kodla sisteme bağlayın',
      'Gönderimler hatlar arasında akıllıca paylaştırılarak güvenle ilerler',
      'Tek bir numaraya yük bindirmeden kesintisiz iletişim sağlanır',
    ],
    image: '/landing/infographics/03-coklu-hat-chatgpt-4-3.png',
  },
  {
    step: '03',
    title: 'Gelen Sipariş ve Yanıtları Yönetin',
    subtitle: 'Müşterilerinizden gelen sorular ve sipariş talepleri ortak ekranda toplanır, anında yanıtlayın.',
    points: [
      'Telefon aramaya, birden fazla tarayıcı sekmesi açmaya gerek yok',
      'Tüm müşteri yanıtları tek gelen kutusunda anında görünür',
      'Fiyat, randevu ve siparişleri ekibinizle birlikte kolayca yönetin',
    ],
    image: '/landing/infographics/04-ortak-inbox-chatgpt-16-9.png',
  },
]

export function HowItWorksSimple() {
  const [activeStep, setActiveStep] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [progressKey, setProgressKey] = useState(0)

  // Auto-rotate steps every 5 seconds, looping continuously
  useEffect(() => {
    if (isPaused) return

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % WORKFLOW_STEPS.length)
      setProgressKey((k) => k + 1)
    }, STEP_DURATION_MS)

    return () => clearInterval(timer)
  }, [isPaused, activeStep])

  const handleStepClick = (idx: number) => {
    setActiveStep(idx)
    setProgressKey((k) => k + 1)
  }

  const current = WORKFLOW_STEPS[activeStep]

  return (
    <section
      className="relative w-full bg-[#f8faf8] py-20 sm:py-28 border-y border-emerald-950/10 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-10">
          {WORKFLOW_STEPS.map((s, idx) => {
            const isActive = idx === activeStep
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => handleStepClick(idx)}
                className={`relative overflow-hidden text-left p-6 sm:p-7 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? 'bg-white border-emerald-500/60 shadow-xl shadow-emerald-900/5 ring-2 ring-emerald-500/20'
                    : 'bg-white/70 hover:bg-white border-slate-200/80 shadow-xs hover:border-slate-300'
                }`}
              >
                {/* Auto-rotation progress indicator on the active card */}
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
                    <div
                      key={`${activeStep}-${progressKey}`}
                      className="h-full bg-emerald-600 rounded-full"
                      style={{
                        width: '100%',
                        transformOrigin: 'left',
                        animation: `stepProgressBar ${STEP_DURATION_MS}ms linear forwards`,
                        animationPlayState: isPaused ? 'paused' : 'running',
                      }}
                    />
                  </div>
                )}

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
            </div>

            {/* Right Interactive Visual Frame */}
            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden border border-slate-200/90 shadow-xl bg-slate-50">
                <Image
                  key={current.image}
                  src={current.image}
                  alt={current.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  className="object-cover object-top transition-all duration-500 ease-out"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
