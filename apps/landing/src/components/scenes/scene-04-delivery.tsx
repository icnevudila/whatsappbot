'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

export function Scene04Delivery() {
  const headRef = useReveal<HTMLDivElement>()
  const [valProgress, setValProgress] = useState(0)
  const [stage, setStage] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStage(1)
        }
      },
      { threshold: 0.3 }
    )
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (stage === 1) {
      let cur = 0
      const interval = setInterval(() => {
        cur += 4
        if (cur >= 100) {
          cur = 100
          clearInterval(interval)
          setStage(2)
        }
        setValProgress(cur)
      }, 35)
      return () => clearInterval(interval)
    }
  }, [stage])

  return (
    <section ref={containerRef} className="scene bg-[#F7F9F8] scene-pad-lg border-y border-hairline">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Story Headline */}
        <div ref={headRef} className="reveal text-center max-w-3xl mx-auto mb-20">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted mb-6">
            KONTROLLÜ GÖNDERİM MOTORU
          </p>
          <h2 className="text-[clamp(36px,5.5vw,76px)] leading-[1.04] font-[600] tracking-tight text-ink mb-6">
            Liste hazır.
            <br />
            Hatlar hazır.
            <br />
            Kampanya hazır.
          </h2>
          <p className="text-xl text-ink-muted max-w-xl mx-auto leading-relaxed">
            5 farklı araç arasında boğulmayın. Rehberinizi doğrulayın, bağlı işletme hatlarınıza akıllıca dağıtın.
          </p>
        </div>

        {/* SIGNATURE MOMENT 02: Flow from Excel to Line Routing */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Step 1: Contact Validation Engine */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-hairline shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-[family-name:var(--font-jetbrains)] uppercase px-3 py-1 rounded-full bg-surface text-ink-muted border border-hairline">
                  01 · Liste Doğrulama
                </span>
                <span className="text-xs text-brand font-medium">Otomatik Temizleme</span>
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-2">musteriler.xlsx</h3>
              <p className="text-sm text-ink-muted mb-6">Excel ve CSV dosyaları anında ayrıştırılır ve biçimlendirilir.</p>
              
              {/* Progress bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
                  <span>2.418 Numara Taranıyor</span>
                  <span className="text-ink font-semibold">{valProgress}%</span>
                </div>
                <div className="h-2 w-full bg-surface rounded-full overflow-hidden border border-hairline">
                  <div 
                    className="h-full bg-brand transition-all duration-75"
                    style={{ width: `${valProgress}%` }}
                  />
                </div>
              </div>

              {/* Verified results */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100">
                  <div className="text-2xl font-[600] text-emerald-600 font-[family-name:var(--font-jetbrains)]">
                    {stage >= 2 ? '2.291' : '...'}
                  </div>
                  <div className="text-xs text-emerald-800/80 mt-1 font-medium">Hazır & Onaylı ✓</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-100">
                  <div className="text-2xl font-[600] text-amber-600 font-[family-name:var(--font-jetbrains)]">
                    {stage >= 2 ? '127' : '...'}
                  </div>
                  <div className="text-xs text-amber-800/80 mt-1 font-medium">Düzeltildi ⚠️</div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-hairline flex items-center justify-between text-xs text-ink-muted">
              <span>Biçim: E.164 Standartı</span>
              <span className="text-brand font-medium">Doğrulandı</span>
            </div>
          </div>

          {/* Connection flow node with Mesajify Logo */}
          <div className="lg:col-span-2 hidden lg:flex flex-col items-center justify-center text-ink-muted">
            <div className="w-14 h-14 rounded-2xl bg-white border border-hairline flex items-center justify-center shadow-md p-2 hover:scale-105 transition-transform duration-300">
              <Image src="/logos/mesajify_app_icon_corporate_squircle.png" width={36} height={36} alt="Mesajify Motor" className="rounded-lg" />
            </div>
            <span className="text-[11px] font-[family-name:var(--font-jetbrains)] uppercase mt-3 tracking-widest text-brand font-semibold">
              MESAJIFY MOTOR
            </span>
          </div>

          {/* Step 2: Smart Multi-Line Balancing */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 border border-hairline shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-[family-name:var(--font-jetbrains)] uppercase px-3 py-1 rounded-full bg-surface text-ink-muted border border-hairline">
                  02 · Akıllı Hat Dağıtımı
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  3 Hat Dengeli
                </span>
              </div>
              
              <h3 className="text-2xl font-[600] text-ink mb-2">Yükü Tek Hatta Bırakmayın</h3>
              <p className="text-sm text-ink-muted mb-6">
                Kampanya paketleri hatlar arasında zamana yayılarak gönderilir. Operasyonel risk sıfıra yaklaşır.
              </p>

              {/* Lines list */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-surface border border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-xs font-[family-name:var(--font-jetbrains)]">
                      01
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">Ana Satış Hattı</div>
                      <div className="text-[11px] text-ink-muted">0532 ••• •• 11</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100">
                    Aktif · 764 msj
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs font-[family-name:var(--font-jetbrains)]">
                      02
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">Destek Hattı B</div>
                      <div className="text-[11px] text-ink-muted">0542 ••• •• 22</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    Aktif · 764 msj
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-hairline flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs font-[family-name:var(--font-jetbrains)]">
                      03
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-ink">Rezerv Hat C</div>
                      <div className="text-[11px] text-ink-muted">0552 ••• •• 33</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                    Dinleniyor · 763 msj
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-hairline flex items-center justify-between text-xs text-ink-muted">
              <span>Toplam: 2.291 Gönderim</span>
              <span className="text-ink font-medium">Kuyrukta Bekleyen: 0</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
