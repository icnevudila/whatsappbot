'use client'

import { useEffect, useRef } from 'react'

const DESKTOP_VIDEO = '/landing/studio/palmate-hero-bg.mp4'
const MOBILE_VIDEO = '/landing/studio/palmate-hero-mobile.mp4'
const POSTER_IMAGE = '/landing/studio/palmate-hero-poster.webp'

function HeroVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false

    const handlePlay = () => {
      if (visible && !reduced.matches && !document.hidden) {
        void video.play().catch(() => {})
      } else {
        video.pause()
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        handlePlay()
      },
      { threshold: 0.1 }
    )
    observer.observe(video)

    document.addEventListener('visibilitychange', handlePlay)
    reduced.addEventListener('change', handlePlay)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handlePlay)
      reduced.removeEventListener('change', handlePlay)
      video.pause()
    }
  }, [])

  return (
    <div className="ml-palmate-hero-media" aria-hidden="true">
      <img
        className="ml-palmate-hero-poster"
        src={POSTER_IMAGE}
        alt=""
        loading="eager"
        decoding="async"
      />
      <video
        ref={videoRef}
        className="ml-palmate-hero-video"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        tabIndex={-1}
      >
        <source src={DESKTOP_VIDEO} media="(min-width: 641px)" type="video/mp4" />
        <source src={MOBILE_VIDEO} media="(max-width: 640px)" type="video/mp4" />
      </video>
    </div>
  )
}

export function Scene01Hero() {
  return (
    <section className="ml-palmate-hero" id="urun" aria-label="Mesajify — WhatsApp Müşteri ve Tanıtım Asistanı">
      {/* 1:1 Palmate Video Arka Planı ve Sinematik Gradient Katmanı */}
      <HeroVideoBackground />

      {/* Ön Plan: Palmate Grid & Tipografi */}
      <div className="ml-palmate-hero-wrap">
        <div className="ml-palmate-hero-copy">
          <div className="ml-palmate-hero-eyebrow">
            <span>DOĞRUDAN WHATSAPP İLE TANITIM VE SATIŞ</span>
          </div>

          <h1>
            Mesajify.<br />
            Tanıtımınızı yapar.<br />
            <em>Müşteri kazandırır.</em>
          </h1>

          <p>
            Civarınızdaki işletmelere ürünlerinizi doğrudan WhatsApp’tan duyurun.
            Hedef kitlenizi belirleyin, dikey reklamınızı paylaşın ve gelen siparişleri tek panelden yönetin.
          </p>

          <div className="ml-palmate-cta-row">
            <a href="https://app.mesajify.com/giris" className="ml-palmate-pill-primary">
              Hemen Başla →
            </a>
            <a href="#kitle" className="ml-palmate-link-action">
              İş başında görün ↓
            </a>
          </div>

          <div className="ml-palmate-hero-badges">
            <div className="ml-palmate-badge-item">
              <span className="ml-palmate-badge-dot" />
              <strong>Hedef İşletme Bulucu</strong>
            </div>
            <div className="ml-palmate-badge-item">
              <span className="ml-palmate-badge-dot" />
              <strong>Yapay Zekâ Kreatif Reklam</strong>
            </div>
            <div className="ml-palmate-badge-item">
              <span className="ml-palmate-badge-dot" />
              <strong>Ortak Gelen Kutusu</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
