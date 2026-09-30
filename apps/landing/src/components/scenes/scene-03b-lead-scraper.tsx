'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

interface ScrapedBusiness {
  name: string
  category: string
  district: string
  phone: string
  source: 'Google Haritalar' | 'Instagram' | 'Açık Rehber'
  verified: boolean
  rating?: string
}

interface PresetOption {
  id: string
  city: string
  district: string
  sector: string
  count: number
  businesses: ScrapedBusiness[]
}

const PRESETS: PresetOption[] = [
  {
    id: 'bursa-beauty',
    city: 'Bursa',
    district: 'Osmangazi & Nilüfer',
    sector: 'Kuaför & Güzellik',
    count: 142,
    businesses: [
      { name: 'Seda Kuaför & Saç Tasarım', category: 'Bayan Kuaförü', district: 'FSM Bulvarı, Nilüfer', phone: '+90 532 418 •• 12', source: 'Google Haritalar', verified: true, rating: '4.8 ★' },
      { name: 'Görükle Güzellik & Bakım', category: 'Güzellik Merkezi', district: 'Görükle, Nilüfer', phone: '+90 542 319 •• 45', source: 'Instagram', verified: true, rating: '4.9 ★' },
      { name: 'Elegance Nail & Estetik', category: 'Tırnak & Cilt Bakımı', district: 'Özlüce, Nilüfer', phone: '+90 552 876 •• 89', source: 'Google Haritalar', verified: true, rating: '4.7 ★' },
      { name: 'Osmangazi Erkek Kuaförü', category: 'Erkek Berberi', district: 'Heykel, Osmangazi', phone: '+90 533 112 •• 34', source: 'Açık Rehber', verified: true, rating: '4.6 ★' },
    ]
  },
  {
    id: 'istanbul-food',
    city: 'İstanbul',
    district: 'Kadıköy & Beşiktaş',
    sector: 'Restoran & Kafe',
    count: 286,
    businesses: [
      { name: 'Moda Kruvasan & Coffee', category: 'Fırın & Kafe', district: 'Moda, Kadıköy', phone: '+90 532 911 •• 70', source: 'Google Haritalar', verified: true, rating: '4.9 ★' },
      { name: 'Akaretler Artisan Burger', category: 'Gurme Burger', district: 'Akaretler, Beşiktaş', phone: '+90 544 280 •• 33', source: 'Instagram', verified: true, rating: '4.8 ★' },
      { name: 'Caddebostan Brasserie', category: 'Restoran', district: 'Caddebostan, Kadıköy', phone: '+90 533 605 •• 99', source: 'Google Haritalar', verified: true, rating: '4.7 ★' },
      { name: 'Sinanpaşa Kahvecisi', category: '3. Nesil Kahve', district: 'Çarşı, Beşiktaş', phone: '+90 535 771 •• 22', source: 'Açık Rehber', verified: true, rating: '4.8 ★' },
    ]
  },
  {
    id: 'ankara-health',
    city: 'Ankara',
    district: 'Çankaya & Tunalı',
    sector: 'Diş & Sağlık',
    count: 94,
    businesses: [
      { name: 'DentSmile Ağız & Diş Sağlığı', category: 'Diş Polikliniği', district: 'Tunalı Hilmi, Çankaya', phone: '+90 532 104 •• 55', source: 'Google Haritalar', verified: true, rating: '4.9 ★' },
      { name: 'Çankaya Fizyoterapi Merkezi', category: 'Fizyoterapi', district: 'Gaziosmanpaşa, Çankaya', phone: '+90 541 332 •• 88', source: 'Açık Rehber', verified: true, rating: '4.7 ★' },
      { name: 'Estetik Gülüş Kliniği', category: 'Estetik Diş Hekimi', district: 'Çayyolu, Çankaya', phone: '+90 553 620 •• 14', source: 'Instagram', verified: true, rating: '4.9 ★' },
      { name: 'Kavaklıdere Diyet & Beslenme', category: 'Beslenme Danışmanlığı', district: 'Kavaklıdere, Çankaya', phone: '+90 530 891 •• 66', source: 'Google Haritalar', verified: true, rating: '4.8 ★' },
    ]
  },
  {
    id: 'izmir-retail',
    city: 'İzmir',
    district: 'Alsancak & Bornova',
    sector: 'Butik & Giyim',
    count: 118,
    businesses: [
      { name: 'Alsancak Vintage Boutique', category: 'Kadın Giyim', district: 'Gül Sokak, Alsancak', phone: '+90 532 443 •• 77', source: 'Instagram', verified: true, rating: '4.8 ★' },
      { name: 'Bornova Ayakkabı & Çanta', category: 'Deri Aksesuar', district: 'Küçükpark, Bornova', phone: '+90 542 809 •• 15', source: 'Google Haritalar', verified: true, rating: '4.6 ★' },
      { name: 'Ege Moda Tasarım Evi', category: 'Özel Dikim & Abiye', district: 'Kordon, Alsancak', phone: '+90 551 290 •• 40', source: 'Instagram', verified: true, rating: '4.9 ★' },
      { name: 'Trend Erkek Giyim', category: 'Erkek Moda', district: 'Süvari Cad., Bornova', phone: '+90 534 612 •• 90', source: 'Açık Rehber', verified: true, rating: '4.7 ★' },
    ]
  }
]

export function SceneLeadScraper() {
  const [selectedId, setSelectedId] = useState(PRESETS[0].id)
  const [copied, setCopied] = useState(false)
  const headRef = useReveal<HTMLDivElement>()
  const cardRef = useReveal<HTMLDivElement>(0.1)

  const activePreset = PRESETS.find(p => p.id === selectedId) || PRESETS[0]

  const handleExport = () => {
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section className="scene bg-[#050B08] text-white scene-pad border-y border-white/5">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6">
        
        {/* Narrative Headline */}
        <div ref={headRef} className="reveal text-center max-w-3xl mx-auto mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4 sm:mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            <span className="text-xs font-medium text-emerald-400">
              İşletme Arama & Lead Motoru
            </span>
          </div>

          <h2 className="text-[clamp(32px,5.5vw,76px)] leading-[1.08] font-[600] tracking-tight mb-4 sm:mb-6">
            Müşteri listeniz yok mu?
            <br />
            <span className="text-brand">Hedef işletmeleri bulun.</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed">
            Telefon numarası aramakla vakit kaybetmeyin. İl, ilçe ve sektörünüzü seçin; Mesajify açık işletme profillerini ve haritaları tarasın, doğrulanmış aktif WhatsApp hatlarını saniyeler içinde toplayıp tek tıkla kampanyanıza bağlasın.
          </p>
        </div>

        {/* Preset Search Chips (Mobile Horizontal Scrollable) */}
        <div className="flex overflow-x-auto gap-2 justify-start sm:justify-center mb-8 sm:mb-12 pb-2 scrollbar-none px-1">
          {PRESETS.map((p) => {
            const isSelected = p.id === selectedId
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-brand text-white border-brand shadow-lg shadow-brand/20'
                    : 'bg-white/5 text-white/70 hover:text-white border-white/10'
                }`}
              >
                <span>{p.city} · {p.sector}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  isSelected ? 'bg-black/30 text-white' : 'bg-white/10 text-white/60'
                }`}>
                  {p.count}+
                </span>
              </button>
            )
          })}
        </div>

        {/* Main Interactive Scanner Container */}
        <div ref={cardRef} className="reveal max-w-4xl mx-auto bg-dark-surface rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          
          {/* Top Control Bar */}
          <div className="p-4 sm:p-6 bg-white/[0.03] border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>{activePreset.city} ({activePreset.district})</span>
                  <span className="text-xs text-brand font-normal">· {activePreset.sector}</span>
                </div>
                <div className="text-xs text-white/50">
                  Google Haritalar & Açık Rehber Taraması
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-3 sm:gap-6 text-xs text-white/70">
              <div>
                <span className="text-brand font-semibold block text-sm">{activePreset.count}</span>
                <span className="text-[11px] text-white/40">Bulunan İşletme</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-emerald-400 font-semibold block text-sm">%100</span>
                <span className="text-[11px] text-white/40">WhatsApp Doğrulandı</span>
              </div>
            </div>
          </div>

          {/* Results List */}
          <div className="divide-y divide-white/5 p-2 sm:p-4">
            {activePreset.businesses.map((biz, idx) => (
              <div
                key={biz.name}
                className="p-3 sm:p-4 rounded-xl hover:bg-white/[0.02] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-semibold text-white/70 shrink-0">
                    0{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate flex items-center gap-2">
                      {biz.name}
                      {biz.rating && (
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                          {biz.rating}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-white/40 truncate mt-0.5">
                      {biz.category} · {biz.district}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pl-10 sm:pl-0">
                  <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                    {biz.phone}
                  </span>
                  <span className="text-[10px] text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10 hidden md:inline-block">
                    {biz.source}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="p-4 sm:p-6 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-white/50 text-center sm:text-left">
              <span>Telefon numaraları </span>
              <span className="text-white font-medium">E.164 uluslararası formatta</span>
              <span> ve çift numara engeliyle doğrulanır.</span>
            </div>

            <button
              onClick={handleExport}
              className={`w-full sm:w-auto px-6 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-md flex items-center justify-center gap-2 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-brand text-white hover:bg-brand-hover shadow-brand/20'
              }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span>Listeye Aktarıldı (142 Numara Hazır)</span>
                </>
              ) : (
                <>
                  <span>Bu İşletmeleri Kampanyaya Aktar →</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </section>
  )
}
