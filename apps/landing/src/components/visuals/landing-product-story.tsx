'use client'

import { AudienceWorkspace } from './audience-workspace'
import { ApprovedScreenGallery } from './approved-screen-gallery'
import { AudienceRequest, BrandContext, CampaignOperatingJourney, ConnectedLineDistribution } from './campaign-control-center'
import { useState, type ReactNode } from 'react'
import { CreativeTransform, SectorCampaignLab, ContactValidationDemo, ReplyToInbox, ProductScreenExplorer } from './product-modules'

function Story({ eyebrow, title, description, dark = false, chapter = '', children }: { eyebrow: string; title: string; description: string; dark?: boolean; chapter?: string; children: ReactNode }) {
  const [paused,setPaused]=useState(false),[run,setRun]=useState(0)
  const animated=['creative','sector','delivery','reply'].includes(chapter)
  const notify=()=>window.dispatchEvent(new Event('lab-motion-change'))
  return <section data-story-paused={paused} className={`ml-product-story ml-chapter-${chapter}${dark ? ' ml-story-dark' : ''}`}>
    <div className="ml-story-heading"><p>{eyebrow}</p><h2>{title}</h2><div>{description}</div></div>
    {animated&&<div className="ml-story-toolbar"><span><i/>İnteraktif ürün akışı <small>Örnek gösterim</small></span><div><button aria-pressed={paused} onClick={()=>{setPaused(!paused);requestAnimationFrame(notify)}}>{paused?'▷ Devam et':'Ⅱ Duraklat'}</button><button onClick={()=>{setRun(run+1);setPaused(false);requestAnimationFrame(notify)}}>↻ Tekrar oynat</button></div></div>}
    <div key={run} className="ml-preview-canvas" data-theme={dark ? 'dark' : 'light'}>{children}</div>
  </section>
}

function InfographicCard({
  src,
  videoSrc,
  alt,
  badge,
  title,
  subtitle,
}: {
  src: string
  videoSrc?: string
  alt: string
  badge: string
  title: string
  subtitle: string
}) {
  return (
    <div
      className="ml-infographic-card"
      style={{
        marginTop: '32px',
        borderRadius: '16px',
        border: '1px solid #e1e9e3',
        background: '#f9fbf9',
        padding: '16px',
        boxShadow: '0 4px 20px rgba(0, 168, 132, 0.05)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          padding: '0 4px',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#168347',
              textTransform: 'uppercase',
              display: 'inline-block',
              marginBottom: '2px',
            }}
          >
            {badge}
          </span>
          <h4
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: '#090B0A',
              margin: 0,
            }}
          >
            {title}
          </h4>
        </div>
        <span
          style={{
            fontSize: '11px',
            color: '#5c6b61',
            background: '#eaf4ee',
            padding: '4px 10px',
            borderRadius: '999px',
            fontWeight: 500,
          }}
        >
          {subtitle}
        </span>
      </div>
      <div
        style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #dce5de',
          background: '#fff',
        }}
      >
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={src}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        ) : (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              objectFit: 'contain',
            }}
          />
        )}
      </div>
    </div>
  )
}

export function LandingDeliveryStory() {
  const [, setReady] = useState(false)
  return (
    <Story
      chapter="delivery"
      eyebrow="01 / HEDEF KİTLENİZ"
      title="Civarınızdaki işletmelere ulaşın. Hedef kitleniz elinizin altında."
      description="Kendi listenizi yükleyin veya hedeflediğiniz bölge ve sektör için kitle talep edin. Talep edilen listenin uygunluğu, kapsamı ve hazırlanması değerlendirme sonrasında netleşir."
    >
      <AudienceWorkspace onReady={setReady} />
      <InfographicCard
        badge="Harita & Bölge Taraması"
        title="Civarınızdaki İşletmeleri ve Potansiyel Müşterileri Keşfedin"
        subtitle="Yapay Zeka Destekli Harita & Kitle Bulucu (Veo Dinamik Video)"
        src="/landing/infographics/06-isletme-bulucu-chatgpt-16-9.png"
        videoSrc="/landing/infographics/06-isletme-bulucu-veo-i2v.mp4"
        alt="Mesajify Harita ve İşletme Bulucu İnfografiği"
      />
    </Story>
  )
}

export function LandingSectorStory() {
  return (
    <Story
      chapter="sector"
      eyebrow="02 / SEKTÖRÜNÜZDE ÖNE ÇIKIN"
      title="İşletmeniz ne sunuyor? Mesajınız anlatsın."
      description="Kuaförlerden toptancılara, restoranlardan inşaat ve sağlığa: Sektörünüze özel hazırlanmış doğrudan WhatsApp mesajlarıyla potansiyel müşterilerinizin cebine ulaşın."
    >
      <SectorCampaignLab />
      <InfographicCard
        badge="Sektörel İletişim & Hat Yönetimi"
        title="Her Sektöre Uygun Doğrudan WhatsApp Tanıtımı"
        subtitle="Akıllı Rota & Hat Dağıtımı (Veo Dinamik Video)"
        src="/landing/infographics/03-coklu-hat-chatgpt-4-3.png"
        videoSrc="/landing/infographics/03-coklu-hat-veo-i2v.mp4"
        alt="Mesajify Sektörel WhatsApp İletişim ve Hat Dağıtım Mimarisi"
      />
    </Story>
  )
}

export function LandingCreativeStory() {
  return (
    <Story
      chapter="creative"
      eyebrow="03 / KREATİF & REKLAM STÜDYOSU"
      title="Tanıtımınıza görsel destek ekleyin."
      description="Ürün fotoğrafınızı ve marka kitinizi kullanarak tanıtım görselleri hazırlayın. Video üretimi de ek bir kreatif seçeneği olarak yer alır."
    >
      <div className="ml-brand-context-panel">
        <BrandContext />
      </div>
      <CreativeTransform />
      <InfographicCard
        badge="Kreatif Stüdyosu"
        title="Dikey Reklam ve Görsel Üretim Mimarisi"
        subtitle="Mesajify Yapay Zeka Stüdyosu (Veo Dinamik Video)"
        src="/landing/infographics/05-kreatif-studyosu-chatgpt-4-3.png"
        videoSrc="/landing/infographics/05-kreatif-studyosu-veo-i2v.mp4"
        alt="Mesajify Kreatif ve Reklam Stüdyosu İnfografiği"
      />
    </Story>
  )
}

export function LandingInboxStory() {
  return (
    <Story
      chapter="reply"
      eyebrow="04 / ORTAK GELEN KUTUSU"
      title="Gelen soruları görün. Konuşmayı sürdürün."
      description="Fiyat, sipariş ve katalog sorularını tek ekranda takip edin. Mesajları yanıtlayın, konuşmalarınızı bir arada görün."
    >
      <ReplyToInbox />
      <InfographicCard
        badge="Ortak Gelen Kutusu"
        title="Gelen Sipariş ve Mesajları Tek Merkezden Yönetin"
        subtitle="Çoklu Operatör & Hızlı Yanıt (Veo Dinamik Video)"
        src="/landing/infographics/04-ortak-inbox-chatgpt-16-9.png"
        videoSrc="/landing/infographics/04-ortak-inbox-veo-i2v.mp4"
        alt="Mesajify Ortak Gelen Kutusu İnfografiği"
      />
    </Story>
  )
}

export function LandingExplorerStory() {
  return (
    <Story
      chapter="explorer"
      eyebrow="05 / KONTROL MERKEZİ"
      title="Tüm tanıtım ve müşteri süreçleriniz tek panelde."
      description="Listenizi hazırlayın, tanıtım mesajlarınızı yönetin ve müşteri konuşmalarını aynı panelden takip edin."
    >
      <ApprovedScreenGallery />
      <InfographicCard
        badge="Ana Platform Mimarisi"
        title="Keşiften Satışa WhatsApp İletişim Akışı"
        subtitle="Mesajify 360° Ekosistem (Veo Dinamik Video)"
        src="/landing/infographics/01-ana-urun-chatgpt-16-9.png"
        videoSrc="/landing/infographics/01-ana-urun-veo-i2v.mp4"
        alt="Mesajify Ana Platform ve Ürün Akışı İnfografiği"
      />
    </Story>
  )
}

