'use client'

import Image from 'next/image'
import { Sparkles, Users, Network, MessageSquare } from 'lucide-react'

const INFRASTRUCTURE_MODULES = [
  {
    step: '01',
    icon: Sparkles,
    title: 'Kreatif Stüdyosu',
    description: 'Ürün fotoğrafınız saniyeler içinde WhatsApp formatında dikey video reklama dönüşür.',
  },
  {
    step: '02',
    icon: Users,
    title: 'Doğrulanmış Kitle',
    description: 'Rehber ve müşteri listenizdeki aktif numaralar filtrelenir, sadece gerçek alıcılara ulaşılır.',
  },
  {
    step: '03',
    icon: Network,
    title: 'Güvenli Hat Altyapısı',
    description: 'İster tek resmi numaranızla, ister arka planda yükü otomatik paylaştıran bağlı hatlarla güvenli gönderim.',
  },
  {
    step: '04',
    icon: MessageSquare,
    title: 'Ortak Gelen Kutusu',
    description: 'Gelen tüm müşteri yanıtları ve sipariş soruları tek ekranda toplanır, anında satışa dönüşür.',
  },
]

export function Scene07Bento() {
  return (
    <section className="relative w-full bg-[#f8faf8] py-20 sm:py-28 border-y border-emerald-950/10 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-emerald-800">
            Platform Mimarisi
          </span>
          <h2 className="mt-4 text-[clamp(30px,4.2vw,54px)] font-bold tracking-tight text-slate-900 leading-[1.12]">
            Dört Güçlü Modül. <br />
            <span className="text-emerald-700">Tek Bir Kusursuz Operasyon.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Kreatif üretiminden hedef kitle doğrulamaya, arka plandaki güvenli hat altyapısından ortak gelen kutusuna kadar tüm sistem birbiriyle tam senkronize çalışır.
          </p>
        </div>

        {/* Big Crisp Architecture Infographic Showcase */}
        <div className="relative max-w-5xl mx-auto rounded-3xl border border-slate-200/90 bg-white p-3 sm:p-5 shadow-2xl shadow-slate-900/5 mb-10">
          <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
            <Image
              src="/landing/infographics/01-ana-urun-chatgpt-16-9.png"
              alt="Mesajify Platform Mimarisi ve Altyapısı"
              fill
              sizes="(max-width: 1280px) 100vw, 1200px"
              className="object-cover object-center"
              priority
            />
          </div>
        </div>

        {/* 4 Connected Module Descriptions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {INFRASTRUCTURE_MODULES.map((mod) => {
            const Icon = mod.icon
            return (
              <div
                key={mod.step}
                className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm hover:border-emerald-300 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-700 tracking-wider">
                    MODÜL {mod.step}
                  </span>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">
                  {mod.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {mod.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
