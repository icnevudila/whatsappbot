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
    </Story>
  )
}

