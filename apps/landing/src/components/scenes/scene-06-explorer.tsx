'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

const TABS = [
  { 
    id: 'hizli', 
    label: 'Hızlı Gönderim', 
    img: '/landing/hizli-gonderim.png', 
    title: 'Dakikalar İçinde Kampanya Kurulumu',
    desc: 'Metninizi yazın, medyanızı ekleyin veya yapay zeka stüdyosundan tek tıkla aktarın. Kişi listenizi seçip anında başlatın.' 
  },
  { 
    id: 'kampanyalar', 
    label: 'Kampanya Yönetimi', 
    img: '/landing/ozet.png', 
    title: 'Tüm Operasyon Tek Ekranda',
    desc: 'Aktif, planlanan ve tamamlanan gönderimlerin anlık teslim durumlarını, yanıt oranlarını ve hat dağılımlarını canlı izleyin.' 
  },
  { 
    id: 'kisiler', 
    label: 'Kişi & Segmentasyon', 
    img: '/landing/kisiler.png', 
    title: 'Akıllı Müşteri Rehberi',
    desc: 'Müşterilerinizi etiketleyin, önceki satın almalarına göre gruplayın ve iletişim almak istemeyenleri otomatik hariç tutun.' 
  },
  { 
    id: 'hat', 
    label: 'Hat Havuzu', 
    img: '/landing/hesaplar.png', 
    title: 'Çoklu İşletme Hattı Entegrasyonu',
    desc: 'Birden fazla WhatsApp Business hattını QR kod ile bağlayın, her hattın anlık durumunu ve sağlık puanını görün.' 
  },
  { 
    id: 'raporlar', 
    label: 'Gönderim Raporları', 
    img: '/landing/raporlar.png', 
    title: 'Şeffaf ve Ölçülebilir Sonuçlar',
    desc: 'Hangi hatta kaç mesaj iletildi, kaç geri dönüş alındı, hangi saatler daha yüksek dönüşüm getirdi tüm detaylarıyla analiz edin.' 
  },
]

export function Scene06Explorer() {
  const [activeTab, setActiveTab] = useState(TABS[0])
  const headRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene bg-white scene-pad-lg border-t border-hairline">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Headline */}
        <div ref={headRef} className="reveal text-center max-w-3xl mx-auto mb-16">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted mb-6">
            GERÇEK UYGULAMA DENEYİMİ
          </p>
          <h2 className="text-[clamp(36px,5.5vw,76px)] leading-[1.04] font-[600] tracking-tight text-ink mb-6">
            Demo değil.
            <br />
            Gerçek Mesajify.
          </h2>
          <p className="text-xl text-ink-muted max-w-xl mx-auto leading-relaxed">
            Hayali mockup'lar değil, bugün binlerce mesajın yönetildiği gerçek Mesajify kontrol panelini keşfedin.
          </p>
        </div>

        {/* Tab Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TABS.map((tab) => {
            const isActive = activeTab.id === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-ink text-white shadow-md'
                    : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Big Browser Frame */}
        <div className="relative mx-auto max-w-[1140px] rounded-3xl border border-hairline-strong bg-white shadow-2xl overflow-hidden">
          
          {/* Header */}
          <div className="h-11 bg-surface border-b border-hairline flex items-center justify-between px-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-black/15" />
              <div className="w-3 h-3 rounded-full bg-black/15" />
              <div className="w-3 h-3 rounded-full bg-black/15" />
            </div>
            <div className="px-4 py-1 rounded-md bg-white border border-hairline text-xs font-[family-name:var(--font-jetbrains)] text-ink-muted">
              app.mesajify.com/{activeTab.id}
            </div>
            <div className="w-10" />
          </div>

          {/* Screenshot Container */}
          <div className="relative w-full aspect-[16/10] bg-surface">
            {TABS.map((tab) => {
              const isSelected = activeTab.id === tab.id
              return (
                <div
                  key={tab.id}
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    isSelected ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
                >
                  <Image
                    src={tab.img}
                    alt={tab.label}
                    fill
                    className="object-cover object-top"
                  />
                </div>
              )
            })}
          </div>

          {/* Bottom Descriptive Bar */}
          <div className="bg-white p-6 md:p-8 border-t border-hairline flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-[600] text-ink">{activeTab.title}</h4>
              <p className="text-sm text-ink-muted mt-1 max-w-2xl leading-relaxed">{activeTab.desc}</p>
            </div>
            <a
              href="https://app.mesajify.com/giris"
              className="px-6 py-3 rounded-xl bg-surface border border-hairline text-sm font-semibold text-ink hover:bg-hairline transition-colors shrink-0"
            >
              Paneli Aç →
            </a>
          </div>

        </div>

      </div>
    </section>
  )
}
