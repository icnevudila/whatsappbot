'use client'

import Image from 'next/image'
import { Sparkles, MessageSquareText, Users2, CheckCircle2 } from 'lucide-react'

export function CampaignPrepInfographic() {
  return (
    <div className="w-full h-full min-h-[380px] sm:min-h-[420px] rounded-2xl bg-gradient-to-br from-slate-900 via-[#0d1d14] to-slate-950 p-4 sm:p-7 text-white flex flex-col justify-between relative overflow-hidden border border-emerald-900/40 shadow-2xl">
      {/* Background glow effects */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-600/10 blur-3xl" />

      {/* Top Header Strip */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-emerald-800/30">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-400">
            Adım 01 · Kampanya ve Mesaj Hazırlığı
          </span>
        </div>
        <span className="text-[11px] font-semibold text-emerald-200 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-700/50">
          WhatsApp Uyumlu Taslak
        </span>
      </div>

      {/* 3 Step Interactive Workflow Cards */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
        {/* Step 1: Görsel / Video */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> 1. Ürün & Medya
            </span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              Yüklendi
            </span>
          </div>

          <div className="relative h-24 w-full rounded-lg overflow-hidden border border-white/15 bg-black/40">
            <Image
              src="/landing/studio/sources/nike_sneaker_raw.jpg"
              alt="Nike Sneaker"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-2">
              <span className="text-[10px] font-semibold text-white">Nike Air Flyknit Sneaker</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-200 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>9:16 Dikey Reklam Formatı</span>
          </div>
        </div>

        {/* Step 2: Kampanya Metni & Şablon */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <MessageSquareText className="h-3.5 w-3.5" /> 2. WhatsApp Mesajı
            </span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              Şablon
            </span>
          </div>

          <div className="rounded-lg bg-[#005c4b]/30 border border-[#005c4b]/60 p-2.5 text-xs text-slate-200 leading-snug flex flex-col gap-1.5">
            <p className="text-[11px] text-white">
              Merhaba <span className="text-emerald-300 font-mono font-bold">{'{{Ad Soyad}}'}</span>,
            </p>
            <p className="text-[11px] text-slate-300">
              Yeni sezon spor koleksiyonumuzda size özel %30 indirim başladı!
            </p>
            <div className="mt-1 flex items-center justify-between pt-1 border-t border-white/10 text-[10px] text-emerald-300 font-semibold">
              <span>Sipariş & Bilgi İçin Tıklayın →</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-200 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>Kişiselleştirilmiş İletişim</span>
          </div>
        </div>

        {/* Step 3: Hedef Kitle */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> 3. Hedef Kitle
            </span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
              Aktif
            </span>
          </div>

          <div className="rounded-lg bg-black/30 border border-white/10 p-2.5 flex flex-col gap-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300 text-[11px]">
              <span>Müşteri Portföyü:</span>
              <strong className="text-white font-mono">12.842 Kişi</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300 text-[11px]">
              <span>Doğrulanan Hatlar:</span>
              <strong className="text-emerald-400 font-mono">%100 Aktif</strong>
            </div>
            <div className="flex justify-between items-center text-slate-300 text-[11px]">
              <span>Kitle Tipi:</span>
              <strong className="text-slate-200">Segmentasyon</strong>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-emerald-200 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
            <span>Otomatik Hat Dağıtımına Hazır</span>
          </div>
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-800/30 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Medya, metin ve kişi listesi onaylandı.</span>
        </div>
        <div className="font-semibold text-emerald-400">
          Tek Tıkla Hatlara Dağıtıma Geçilebilir →
        </div>
      </div>
    </div>
  )
}
