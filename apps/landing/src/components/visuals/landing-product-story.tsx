'use client'

import { AudienceWorkspace } from './audience-workspace'
import { ApprovedScreenGallery } from './approved-screen-gallery'
import { AudienceRequest, BrandContext, CampaignOperatingJourney, ConnectedLineDistribution } from './campaign-control-center'
import { useState, type ReactNode } from 'react'
import { CreativeTransform, SectorCampaignLab, ContactValidationDemo, ReplyToInbox, ProductScreenExplorer } from './product-modules'

function Story({ eyebrow, title, description, dark = false, chapter = '', children }: { eyebrow: string; title: string; description: string; dark?: boolean; chapter?: string; children: ReactNode }) {
  return <section className={`ml-product-story ml-chapter-${chapter}${dark ? ' ml-story-dark' : ''}`}>
    <div className="ml-story-heading"><p>{eyebrow}</p><h2>{title}</h2><div>{description}</div></div>
    <div className="ml-preview-canvas" data-theme={dark ? 'dark' : 'light'}>{children}</div>
  </section>
}



export function LandingCreativeStory() {
  return (
    <Story
      chapter="creative"
      eyebrow="01 / KREATİF REKLAM STÜDYOSU"
      title="Ürün fotoğrafınızdan profesyonel dikey reklam hazırlayın."
      description="Ajansa veya karmaşık video editörlerine gerek yok. Ürün fotoğrafınızı yükleyin; saniyeler içinde etkileyici dikey reklam videonuz ve kampanya mesajınız hazır olsun."
    >
      <div className="ml-brand-context-panel">
        <BrandContext />
      </div>
      <CreativeTransform />
    </Story>
  )
}

export function LandingSectorStory() {
  return (
    <Story
      chapter="sector"
      eyebrow="02 / SEKTÖRÜNÜZE ÖZEL KAMPANYALAR"
      title="İşletmeniz ne sunuyor? Mesajınız anlatsın."
      description="Kuaförlerden toptancılara, restoranlardan e-ticarete: Sektörünüze özel hazırlanmış doğrudan WhatsApp mesajlarıyla potansiyel müşterilerinizin cebine ulaşın."
    >
      <SectorCampaignLab />
    </Story>
  )
}

export function LandingInboxStory() {
  return (
    <Story
      chapter="reply"
      eyebrow="03 / ORTAK GELEN KUTUSU"
      title="Gelen sipariş ve soruları tek ekrandan yönetin."
      description="Telefon aramayın, birden fazla tarayıcı sekmesi arasında kaybolmayın. Tüm bağlı hatlarınızdan gelen sipariş ve fiyat soruları tek gelen kutusunda toplanır, anında satışa dönüşür."
    >
      <ReplyToInbox />
    </Story>
  )
}

export function LandingExplorerStory() {
  return (
    <Story
      chapter="explorer"
      eyebrow="04 / KAMPANYA KONTROL MERKEZİ"
      title="Tüm tanıtım ve müşteri süreçleriniz tek panelde."
      description="Kampanyalarınızı kurun, aktif gönderimlerin durumunu izleyin ve müşteri konuşmalarını aynı merkezden yönetin."
    >
      <ApprovedScreenGallery />
    </Story>
  )
}

export function LandingDeliveryStory() {
  const [, setReady] = useState(false)
  return (
    <Story
      chapter="delivery"
      eyebrow="05 / REHBER VE HEDEF KİTLE"
      title="Müşteri rehberinizi bağlayın veya kitle belirleyin."
      description="Kendi müşteri listenizi ekleyin veya hedeflediğiniz sektör için kitle talebinde bulunun. Numaralar otomatik kontrol edilir ve güvenli gönderime hazırlanır."
    >
      <AudienceWorkspace onReady={setReady} />
    </Story>
  )
}

