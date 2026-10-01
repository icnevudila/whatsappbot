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

export function LandingCampaignStory() {
  return <Story chapter="journey" eyebrow="01 / BOFE KAMPANYASI" title="Bir panel. Bütün kampanya." description="Kampanya hazırlığından bağlı WhatsApp hatlarına ve ortak Gelen Kutusu’na."><CampaignOperatingJourney /></Story>
}
export function LandingCreativeStory() {
  return <Story chapter="creative" eyebrow="05 / KAMPANYANIZA KREATİF DESTEĞİ" title="Ürününüz sahneye çıksın." description="Markanızı tanımlayın, marka kitinizi ve ürününüzü ekleyin. Kampanyanız için görseller hazırlayın; video üretimini de kreatif seçenekleri arasında değerlendirin."><div className="ml-brand-context-panel"><BrandContext /></div><CreativeTransform /></Story>
}
export function LandingSectorStory() {
  return <Story chapter="sector" eyebrow="06 / SEKTÖR ÖRNEKLERİ" title="Her işletmenin bir hikâyesi var." description="Farklı sektörler için reklamdan müşteri yanıtına uzanan örnekleri keşfedin."><SectorCampaignLab /></Story>
}
export function LandingDeliveryStory() {
  const [ready, setReady] = useState(false)
  return <Story chapter="delivery" eyebrow="02 / KAMPANYA HAZIRLIĞI" title="Kitle hazır. Kampanya hazır." description="Kendi listenizi yükleyin veya hizmetin sunulduğu yerlerde Mesajify’dan liste talep edin."><AudienceWorkspace onReady={setReady} /><div className="ml-chapter-bridge" data-ready={ready}><span>{ready ? 'Kampanya kitlesi → Bağlı hatlar' : 'Kitle hazırlığı → Bağlı hatlar'}</span><i>↓</i></div><h3 className="ml-routing-title">Bir kampanya. Birden fazla hat.</h3><ConnectedLineDistribution ready={ready} /></Story>
}
export function LandingInboxStory() {
  return <Story chapter="reply" eyebrow="03 / ORTAK GELEN KUTUSU" title="Birden fazla hat. Tek gelen kutusu." description="Bağlı WhatsApp hatlarınıza gelen müşteri yanıtları Mesajify Gelen Kutusu’nda birleşir."><ReplyToInbox /></Story>
}
export function LandingExplorerStory() {
  return <Story chapter="explorer" eyebrow="04 / ÜRÜNÜ KEŞFEDİN" title="Kontrol merkezi elinizin altında." description="Konuşmadan kampanya yönetimine, aynı kontrol merkezi."><ApprovedScreenGallery /></Story>
}
