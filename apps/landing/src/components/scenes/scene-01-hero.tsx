'use client'

import { useState, useEffect, useRef } from 'react'
import { MesajifyMark } from '../brand/mesajify-mark'
import { replyExamples } from '../visuals/story-messages'
import { useSceneClock } from '../visuals/product-modules'

const heroVariations = [
  {
    id: 'platform',
    label: 'Mesajify Platform',
    icon: '⚡',
    badge: 'MESAJIFY · RESMİ PLATFORM VİTRİNİ',
    video: '/landing/studio/hero-flow-veo.mp4',
    poster: '/landing/studio/hero-flow-veo-poster.jpg',
    business: 'Mesajify',
    campaign: 'Civarınızdaki işletmelere WhatsApp ile ulaşın.',
    reply: 'Fiyat ve paketleri öğrenebilir miyim?'
  },
  {
    id: 'ecommerce',
    label: 'E-Ticaret & Spor',
    icon: '👟',
    badge: 'NIKE AIR · 9:16 VEO DİKEY REKLAM',
    video: '/landing/studio/ecommerce-flow-veo.mp4',
    poster: '/landing/studio/ecommerce-flow-veo-poster.jpg',
    business: 'Spor Giyim',
    campaign: 'Yeni sezon koşu serimizde lansmana özel %30 indirim!',
    reply: 'Siyah renk 42 numara mevcut mu?'
  },
  {
    id: 'restaurant',
    label: 'Gurme Restoran',
    icon: '🍔',
    badge: 'BURGER LAB · GURME REKLAM',
    video: '/landing/studio/restaurant-flow-veo.mp4',
    poster: '/landing/studio/restaurant-flow-veo-poster.jpg',
    business: 'Burger Lab',
    campaign: 'Özel gurme burger menümüz ve akşam lezzetleri hazır.',
    reply: 'Bu akşam için iki kişilik yer var mı?'
  },
  {
    id: 'automotive',
    label: 'Lüks Otomotiv',
    icon: '🏎️',
    badge: 'VELOCE MOTORS · SHOWROOM',
    video: '/landing/studio/automotive-flow-veo.mp4',
    poster: '/landing/studio/automotive-flow-veo-poster.jpg',
    business: 'Otomotiv',
    campaign: 'Yeni nesil spor modelimizi test sürüşüyle keşfedin.',
    reply: 'Hafta sonu test sürüşü yapabilir miyim?'
  },
  {
    id: 'realestate',
    label: 'Premium Emlak',
    icon: '🏢',
    badge: 'REZİDANS & VİLLA · 9:16 VEO',
    video: '/landing/studio/realestate-flow-veo.mp4',
    poster: '/landing/studio/realestate-flow-veo-poster.jpg',
    business: 'Emlak Portföyü',
    campaign: 'Kordon boyu lüks villa projemizde özel lansman fırsatları.',
    reply: 'Kat planlarını ve detayları iletir misiniz?'
  }
]

function HeroActivity() {
  const { ref, time, cycle } = useSceneClock(6)
  const beat = time < 1.5 ? 0 : time < 3 ? 1 : time < 4.5 ? 2 : 3
  return (
    <div ref={ref} className="ml-hero-activity" data-beat={beat}>
      <div className="ml-hero-activity-message" key={cycle + '-' + beat}>
        <span className="ml-activity-avatar">{beat < 2 ? 'M' : 'A'}</span>
        <div>
          <small>{beat < 2 ? 'ÖRNEK TANITIM' : 'ÖRNEK MÜŞTERİ YANITI'}</small>
          <strong>
            {
              [
                'Tanıtım kitlesi hazır',
                'Tanıtım mesajı hazır',
                replyExamples[(cycle + 4) % replyExamples.length],
                'Yanıt ortak Gelen Kutusu’nda'
              ][beat]
            }
          </strong>
        </div>
        <span>{beat === 3 ? '✓' : '↗'}</span>
      </div>
    </div>
  )
}

function HeroBusinessFlow({
  business,
  campaign,
  reply
}: {
  business: string
  campaign: string
  reply: string
}) {
  const { ref, time } = useSceneClock(5)
  const phase = time < 1 ? 0 : time < 2.2 ? 1 : 2
  return (
    <div ref={ref} className="ml-business-flow" data-phase={phase}>
      <svg viewBox="0 0 260 112" aria-hidden="true">
        <path d="M68 56H192" fill="none" stroke="#bdd8c7" strokeWidth="2" />
        <path
          d="M68 56H192"
          fill="none"
          stroke="#00a884"
          strokeWidth="5"
          pathLength="100"
          className="ml-business-packet"
        />
        <rect x="8" y="20" width="64" height="72" rx="12" fill="#fff" stroke="#bdd8c7" />
        <path
          d="M22 49V77H58V49M18 49l6-15h32l6 15M18 49q7 10 14 0q8 10 15 0M36 77V60h12v17"
          fill="none"
          stroke="#168347"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <rect x="188" y="20" width="64" height="72" rx="12" fill="#e4f5eb" stroke="#90c6a6" />
        <path
          d="M204 39h32v25h-15l-9 8v-8h-8zM211 47h18M211 55h13"
          fill="none"
          stroke="#168347"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      <div className="ml-business-flow-labels">
        <strong>{business}</strong>
        <strong>WhatsApp</strong>
      </div>
      <div className="ml-business-flow-message">
        <span>{phase < 2 ? '↗' : '↙'}</span>
        <p>{phase < 2 ? campaign : reply}</p>
      </div>
    </div>
  )
}

export function Scene01Hero() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [manual, setManual] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = heroVariations[activeIndex]

  // Auto-advance loop every 8 seconds if not manual locked
  useEffect(() => {
    if (manual) return
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % heroVariations.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [manual])

  return (
    <section className="ml-product-story ml-hero">
      <div className="ml-hero-copy">
        <h1>Civarınızdaki işletmelere<br />ürünlerinizi tanıtın.</h1>
        <p className="ml-hero-lead">Menünüzü, ürünlerinizi veya hizmetinizi WhatsApp’tan duyurun.</p>
        <p className="ml-hero-description">Kendi müşteri listenizi kullanın veya hedeflediğiniz bölge ve sektör için kitle talep edin. Tanıtım mesajınızı paylaşın; fiyat, ürün ve sipariş sorularını tek yerden yanıtlayın.</p>
        <div className="ml-hero-actions">
          <a href="https://app.mesajify.com/giris">Hemen Başla →</a>
          <a href="#kitle">Nasıl Çalışır ↓</a>
        </div>
        <div className="ml-hero-steps">
          <span>Hedef kitle</span>
          <span>Doğrudan WhatsApp Reklamı</span>
          <span>Müşteri yanıtları</span>
        </div>
      </div>
      <div className="ml-hero-visual" aria-label="Tek Mesajify panelinde kitle bulucu, kreatif reklam, WhatsApp tanıtımı ve Ortak Gelen Kutusu">
        <div className="ml-hero-film">
          <header>
            <MesajifyMark variant="full" size="md" decorative />
          </header>

          {/* Interactive Variation Loop Selector */}
          <div
            className="ml-hero-variation-tabs"
            role="tablist"
            aria-label="Vitrin Reklam Varyasyonları"
            style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              background: '#ffffff',
              borderBottom: '1px solid #e1e9e3',
              overflowX: 'auto',
              scrollbarWidth: 'none'
            }}
          >
            {heroVariations.map((v, i) => (
              <button
                key={v.id}
                role="tab"
                aria-selected={i === activeIndex}
                onClick={() => {
                  setActiveIndex(i)
                  setManual(true)
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: i === activeIndex ? 700 : 500,
                  color: i === activeIndex ? '#ffffff' : '#475569',
                  background: i === activeIndex ? '#00a884' : '#f1f5f9',
                  border: i === activeIndex ? '1px solid #00a884' : '1px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease'
                }}
              >
                <span>{v.icon}</span>
                <span>{v.label}</span>
              </button>
            ))}
          </div>

          <div className="ml-hero-film-content">
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div className="ml-media" style={{ aspectRatio: '9/16' }}>
                <video
                  ref={videoRef}
                  key={current.video}
                  src={current.video}
                  poster={current.poster}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  aria-label={current.badge}
                />
              </div>

              {/* Dynamic Badge Overlay */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '10px',
                  left: '10px',
                  right: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: 'rgba(0, 0, 0, 0.68)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: '8px',
                  fontSize: '10px',
                  color: '#ffffff',
                  pointerEvents: 'none'
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <i
                    style={{
                      display: 'inline-block',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#00a884',
                      boxShadow: '0 0 6px #00a884'
                    }}
                  />
                  {current.badge}
                </span>
                <span
                  style={{
                    color: '#a7f3d0',
                    fontSize: '9px',
                    fontWeight: 700
                  }}
                >
                  9:16 VEO
                </span>
              </div>
            </div>

            <div className="ml-hero-film-story">
              <h2>Ürününüzü tanıtın.<br />Müşteri kazanın.</h2>
              <p>Hedef işletme ve kitle</p>
              <p>Ürününüzü tanıtan dikey reklam</p>
              <HeroBusinessFlow
                business={current.business}
                campaign={current.campaign}
                reply={current.reply}
              />
              <div className="ml-hero-film-inbox">
                <MesajifyMark size="md" decorative />
                <div>
                  <strong>Ortak Gelen Kutusu</strong>
                  <small>Gelen sipariş ve talepler tek panelde</small>
                </div>
              </div>
            </div>
          </div>
          <HeroActivity />
        </div>
      </div>
    </section>
  )
}
