'use client'

import Image from 'next/image'
import { MapPin, CheckCircle2, Filter } from 'lucide-react'
import { ApprovedScreenGallery } from './approved-screen-gallery'
import { UnifiedInboxShowcase } from './unified-inbox-showcase'
import { CleanCreativeStudio } from './clean-creative-studio'
import { type ReactNode } from 'react'
import { SectorCampaignLab } from './product-modules'
import { LazyVideo } from './lazy-video'

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
      <CleanCreativeStudio />
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
      <UnifiedInboxShowcase />
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

export function LandingDiscoveryStory() {
  return (
    <Story
      chapter="delivery"
      eyebrow="HEDEF KİTLE VE İŞLETME BULUCU"
      title="Kendi listenizi yükleyin veya bölgenizdeki işletmeleri keşfedin."
      description="Müşteri listeniz hazır değilse endişelenmeyin. İşletme Bulucu ile hedeflediğiniz şehir, ilçe ve sektördeki doğrulanmış WhatsApp işletme numaralarını filtreleyerek kampanya kitlenize dahil edin."
    >
      <div className="w-full max-w-[1100px] mx-auto">
        <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-3xl overflow-hidden border border-slate-200/90 shadow-2xl bg-slate-950 mb-8">
          <LazyVideo
            src="/landing/infographics/06-isletme-bulucu-veo-i2v.mp4"
            poster="/landing/infographics/06-isletme-bulucu-veo-i2v-poster.webp"
            alt="Mesajify Hedef Kitle ve İşletme Bulucu"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <MapPin className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Bölge & Sektör Taraması</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Kadıköy, Beşiktaş veya tüm Türkiye genelinde; kafe, restoran, butik veya toptancıları konuma göre filtreleyin.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Doğrulanmış Numaralar</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Sadece aktif ve mesaj alabilen doğrulanmış WhatsApp işletmeleri listelenir; geçersiz numaralar elenir.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
            <div className="flex items-center gap-2.5 mb-2">
              <Filter className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <h4 className="text-sm font-bold text-slate-900">Tek Tıkla Kampanyaya</h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              İster Excel listenizi içe aktarın, ister bulduğunuz işletmeleri tek tıkla kampanya hedef kitlenize ekleyin.
            </p>
          </div>
        </div>
      </div>
    </Story>
  )
}


