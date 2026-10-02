'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { MesajifyMark } from '../brand/mesajify-mark'
import {
  Send,
  Inbox,
  Users,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Play,
  Shield,
  TrendingUp,
} from 'lucide-react'

interface HeroTab {
  id: string
  label: string
  tag: string
  title: string
  description: string
  badge: string
  image: string
  statLabel: string
  statValue: string
}

const HERO_TABS: HeroTab[] = [
  {
    id: 'campaign',
    label: 'Kampanya Yönetimi',
    tag: 'Akıllı Gönderim',
    title: 'Doğrudan WhatsApp İle Hedef Kitlenize Ulaşın',
    description:
      'Gelişmiş filtreleme ve çoklu hat dağıtımı ile mesajlarınızı müşterilerinize güvenle ve kesintisiz ulaştırın.',
    badge: 'Aktif Dağıtım',
    image: '/landing/infographics/01-ana-urun-chatgpt-16-9.png',
    statLabel: 'Ortalama Açılma Oranı',
    statValue: '%94.8',
  },
  {
    id: 'finder',
    label: 'İşletme Bulucu',
    tag: 'B2B Kitle',
    title: 'Civarınızdaki ve Sektörünüzdeki Potansiyel Müşteriler',
    description:
      'İl, ilçe ve kategori bazlı doğrulanmış işletme veritabanı ile sıcak müşteri kitleleri oluşturun.',
    badge: 'Kitle Tespiti',
    image: '/landing/infographics/06-isletme-bulucu-chatgpt-16-9.png',
    statLabel: 'Hedef Kitle Havuzu',
    statValue: '250.000+',
  },
  {
    id: 'inbox',
    label: 'Ortak Gelen Kutusu',
    tag: 'Satış & Destek',
    title: 'Tüm WhatsApp Hatlarından Gelen Talepler Tek Ekranda',
    description:
      'Ekip arkadaşlarınızla birlikte gelen siparişleri, soruları ve randevu taleplerini anında karşılayın.',
    badge: 'Ortak Panel',
    image: '/landing/infographics/04-ortak-inbox-chatgpt-16-9.png',
    statLabel: 'İlk Yanıt Süresi',
    statValue: '< 45 sn',
  },
  {
    id: 'creative',
    label: 'Kreatif Reklam',
    tag: 'AI Reklam Motoru',
    title: 'Ürün Fotoğrafınızdan Profesyonel Dikey Reklam',
    description:
      'Saniyeler içinde dikkat çekici WhatsApp video ve dikey kreatif reklamları oluşturup yayına alın.',
    badge: 'Otomatik Üretim',
    image: '/landing/current/creative-selected.png',
    statLabel: 'Tıklama & Dönüşüm',
    statValue: '3.4x Artış',
  },
]

export function Scene01Hero() {
  const [activeTab, setActiveTab] = useState<string>('campaign')
  const currentTab = HERO_TABS.find((t) => t.id === activeTab) || HERO_TABS[0]

  return (
    <section className="palmate-hero relative min-h-[920px] w-full overflow-hidden bg-[#070e0a] text-white pt-28 pb-20 selection:bg-brand/20 selection:text-brand">
      {/* Background Ambient Glows & Subtle Grid Mesh */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(0,168,132,0.18),transparent_68%)] blur-2xl" />
        <div className="absolute top-1/3 -left-36 w-[500px] h-[500px] bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.08),transparent_70%)] blur-3xl" />
        <div className="absolute top-1/2 -right-36 w-[600px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(22,131,71,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4.5rem_4.5rem] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_78%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1380px] px-4 sm:px-6 lg:px-8">
        {/* Top Announcement Eyebrow */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/25 bg-emerald-950/40 px-4 py-1.5 backdrop-blur-md transition-all duration-300 hover:border-emerald-400/40">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider text-emerald-300 uppercase">
              WHATSAPP KAMPANYA &amp; MÜŞTERİ KAZANIM PLATFORMU
            </span>
          </div>

          {/* Palmate Style Hero Heading */}
          <h1 className="mt-8 max-w-5xl font-bold tracking-tight text-white [font-size:clamp(38px,5.4vw,76px)] [line-height:1.06]">
            Civarınızdaki işletmelere tanıtın. <br />
            <span className="bg-gradient-to-r from-emerald-300 via-green-400 to-teal-300 bg-clip-text text-transparent">
              Doğrudan WhatsApp ile müşteri kazanın.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg sm:text-xl text-emerald-100/75 leading-relaxed font-normal">
            Kendi müşteri listenizi yükleyin veya işletme bulucu ile hedef kitlenizi seçin.
            Dikey video ve mesajlarınızı dağıtın, gelen siparişleri tek gelen kutusundan yönetin.
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://app.mesajify.com/giris"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-7 py-4 text-base font-semibold text-slate-950 shadow-[0_0_35px_rgba(16,185,129,0.35)] transition-all duration-300 hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98]"
            >
              Hemen Başla
              <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#kitle"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-4 text-base font-medium text-white/90 backdrop-blur-md transition-all duration-300 hover:bg-white/10 hover:border-white/30"
            >
              Platformu İncele
              <span className="text-emerald-400">↓</span>
            </a>
          </div>

          {/* Trust Highlights under CTA */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs sm:text-sm text-emerald-200/60">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400 h-4 w-4" />
              Doğrulanmış B2B İşletme Havuzu
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400 h-4 w-4" />
              Çoklu Hat Akıllı Yönlendirme
            </span>
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400 h-4 w-4" />
              Ortak Müşteri Gelen Kutusu
            </span>
          </div>
        </div>

        {/* =========================================================================
            Palmate-Inspired Wide Platform Stage with Interactive Multi-tab & Veo Video
            ========================================================================= */}
        <div className="mt-14 relative rounded-2xl sm:rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-2.5 sm:p-5 backdrop-blur-2xl shadow-[0_30px_90px_rgba(0,0,0,0.65)]">
          {/* Top Bar: Nav Tabs (Palmate style switcher) */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4 px-2 sm:px-4">
            <div className="flex flex-wrap items-center gap-2">
              {HERO_TABS.map((tab) => {
                const isActive = tab.id === activeTab
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative rounded-xl px-4 py-2 text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                        : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>

            <div className="hidden md:flex items-center gap-3 text-xs text-white/50">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400" />
              <span>Mesajify OS v3.2 · Canlı Demo</span>
            </div>
          </div>

          {/* Stage Content Grid: Main App Showcase + Embedded Veo Loop Reel */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left/Center Area (8 cols): Active Mesajify Application Screen & Real-time Info */}
            <div className="lg:col-span-8 flex flex-col justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-6 overflow-hidden relative group">
              {/* Meta Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-500/20 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                    {currentTab.tag}
                  </span>
                  <h3 className="text-base sm:text-lg font-semibold text-white">
                    {currentTab.title}
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xs text-white/50">{currentTab.statLabel}</div>
                  <div className="text-sm font-bold text-emerald-400">{currentTab.statValue}</div>
                </div>
              </div>

              {/* Real App Screenshot Presentation */}
              <div className="relative w-full aspect-[16/9] sm:aspect-[16/9.5] rounded-xl overflow-hidden border border-white/10 bg-slate-950/80 shadow-2xl">
                <Image
                  src={currentTab.image}
                  alt={currentTab.title}
                  fill
                  className="object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                  priority
                />
                {/* Subtle Inner Glass Vignette */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-white/80 backdrop-blur-md bg-black/50 px-3 py-2 rounded-lg border border-white/10">
                  <span className="font-medium">{currentTab.description}</span>
                  <span className="hidden sm:inline-block text-emerald-400 font-semibold">{currentTab.badge}</span>
                </div>
              </div>
            </div>

            {/* Right Area (4 cols): Embedded AI Commercial Loop Reel (Palmate aesthetic with Mesajify Veo Video) */}
            <div className="lg:col-span-4 flex flex-col rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-black/60 p-4 sm:p-5 relative overflow-hidden justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MesajifyMark size="sm" decorative />
                    <span className="text-xs font-semibold text-white tracking-wide">
                      CANLI DİKEY REKLAM
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Veo Loop
                  </span>
                </div>
                <p className="text-xs text-white/60 mb-3">
                  Kampanyalarınızda müşterilerinize giden dikey yüksek kaliteli video tanıtımlar.
                </p>
              </div>

              {/* Looping Video Container (Phone Frame Mockup) */}
              <div className="relative mx-auto w-full max-w-[260px] sm:max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden border-2 border-white/20 shadow-[0_15px_40px_rgba(0,0,0,0.8)] bg-black">
                <video
                  src="/landing/studio/mesajify-hero-loop-seamless.mp4"
                  poster="/landing/studio/mesajify-hero-loop-poster.jpg"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                />
                {/* Floating WhatsApp Action Overlay */}
                <div className="absolute bottom-3 inset-x-3 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 p-2.5 flex items-center justify-between text-white">
                  <div className="min-w-0 pr-2">
                    <div className="text-[11px] font-bold text-white truncate">Ürün Tanıtım Mesajı</div>
                    <div className="text-[9px] text-emerald-400">Tek tıkla sipariş verin</div>
                  </div>
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-bold text-xs shadow-md">
                    →
                  </div>
                </div>
              </div>

              {/* Bottom Quick Feature note */}
              <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                <span>Dikey Format: 9:16</span>
                <span className="text-emerald-400 font-medium">Ultra HD &amp; Kesintisiz Döngü</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
