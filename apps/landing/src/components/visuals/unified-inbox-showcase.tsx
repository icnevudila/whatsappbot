'use client'

import Image from 'next/image'
import { MessageSquare, Users, Zap, ShieldCheck } from 'lucide-react'

export function UnifiedInboxShowcase() {
  const highlights = [
    {
      icon: MessageSquare,
      title: 'Tüm Hatlar Tek Ekranda',
      desc: 'Farklı WhatsApp hatlarınızdan gelen tüm müşteri mesajları tek ortak gelen kutusunda toplanır.',
    },
    {
      icon: Zap,
      title: 'Hızlı Yanıt ve Şablonlar',
      desc: 'Fiyat listesi, katalog ve kargo detaylarını tek tıkla müşteriye ileterek siparişi anında kapatın.',
    },
    {
      icon: Users,
      title: 'Temsilci & Ekip Yönetimi',
      desc: 'Gelen soruları satış ekibinize paylaştırın, hangi hatta kimin baktığını kolayca takip edin.',
    },
  ]

  return (
    <div className="w-full max-w-[1240px] mx-auto space-y-8">
      {/* 3 Core Value Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {highlights.map((h, i) => {
          const Icon = h.icon
          return (
            <div
              key={i}
              className="p-5 rounded-2xl border border-slate-200/80 bg-white shadow-xs hover:border-emerald-300 transition-all duration-200"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex-shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900">{h.title}</h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pl-0.5">{h.desc}</p>
            </div>
          )
        })}
      </div>

      {/* Main Inbox Browser Showcase */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xl shadow-slate-900/5 overflow-hidden">
        {/* Browser Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200/70 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
            <span className="ml-3 text-slate-400 font-mono text-[11px]">app.mesajify.com/gelen-kutusu</span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium text-[11px] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Tüm Bağlı Hatlar Aktif</span>
          </div>
        </div>

        {/* High-Resolution Clean Interface Preview */}
        <div className="relative aspect-[16/10] w-full bg-slate-950 overflow-hidden">
          <video
            ref={(el) => {
              if (el) {
                el.muted = true
                el.defaultMuted = true
              }
            }}
            src="/landing/infographics/04-ortak-inbox-veo-i2v.mp4"
            poster="/landing/infographics/04-ortak-inbox-veo-i2v-poster.webp"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>
    </div>
  )
}
