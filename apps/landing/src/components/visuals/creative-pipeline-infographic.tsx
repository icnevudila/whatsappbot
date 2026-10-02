'use client'

import { Image as ImageIcon, Palette, Smartphone, ArrowRight, CheckCircle2 } from 'lucide-react'

export function CreativePipelineInfographic() {
  const steps = [
    {
      num: '01',
      title: 'Ham Fotoğraf & Ürün Girişi',
      desc: 'Telefonla çektiğiniz ürün fotoğrafını veya hazır katalog görselini ekleyin.',
      tag: 'Giriş',
      icon: ImageIcon,
    },
    {
      num: '02',
      title: 'Kurumsal Marka Kiti',
      desc: 'Logonuz, renkleriniz ve kampanya mesajınız otomatik olarak tasarıma işlenir.',
      tag: 'Prodüksiyon',
      icon: Palette,
    },
    {
      num: '03',
      title: 'Dikey WhatsApp Reklamı',
      desc: '9:16 dikey formatta, anında sipariş getirecek reklam videonuz hazır.',
      tag: 'Yayına Hazır',
      icon: Smartphone,
    },
  ]

  return (
    <div className="w-full max-w-[1100px] mx-auto mb-10 rounded-2xl border border-slate-200/90 bg-white/95 p-6 sm:p-7 shadow-lg shadow-emerald-950/5 backdrop-blur-sm">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-6 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-900">
            Kreatif Üretim Akışı
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-xs text-slate-500 font-medium">
            Ham Fotoğraftan Yayına Hazır Reklama
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
          <span>9:16 Dikey WhatsApp Formatı</span>
        </div>
      </div>

      {/* 3 Step Pipeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
        {steps.map((st, i) => {
          const Icon = st.icon
          return (
            <div
              key={st.num}
              className="relative p-5 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-[#fbfdfc] shadow-xs hover:border-emerald-300/80 transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-3.5">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100/70 text-emerald-800">
                  {st.num}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {st.tag}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs flex-shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 leading-snug">
                  {st.title}
                </h4>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed pl-0.5">
                {st.desc}
              </p>

              {/* Connecting arrow for desktop between cards */}
              {i < 2 && (
                <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-6 w-6 items-center justify-center rounded-full bg-white border border-slate-200 shadow-xs text-emerald-600 pointer-events-none">
                  <ArrowRight className="h-3 w-3" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
