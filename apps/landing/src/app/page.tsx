import { Scene01Hero } from '@/components/scenes/scene-01-hero'
import {
  LandingDeliveryStory as Scene02LeadAndAudience,
  LandingSectorStory as Scene03Sectors,
  LandingCreativeStory as Scene04CreativeStudio,
  LandingInboxStory as Scene05Inbox,
  LandingExplorerStory as Scene06Explorer,
} from '@/components/visuals/landing-product-story'
import './visual-lab/visual-lab.css'
import './visual-lab/v2.css'
import '@/components/visuals/landing-product-story.css'
import '@/components/visuals/campaign-control-center.css'
import '@/components/visuals/product-language.css'
import { Scene07Bento } from '@/components/scenes/scene-07-bento'
import { Scene08TrustFaq } from '@/components/scenes/scene-08-trust-faq'
import { Scene09FinalCta } from '@/components/scenes/scene-09-final-cta'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <>
      <main className="w-full">
        {/* 01 · HERO: Doğrudan WhatsApp İle Tanıtım & Reklam */}
        <div id="urun">
          <Scene01Hero />
        </div>

        {/* 02 · İŞLETME VE MÜŞTERİ BULUCU (Civarınızdaki işletmeler & Türkiye/Dünya Kitlesi) */}
        <div id="kitle">
          <div id="nasil-calisir"><Scene02LeadAndAudience /></div>
        </div>

        {/* 03 · SEKTÖRÜNÜZDE ÖNE ÇIKIN (Kuaför, Kafe, Restoran, İnşaat, Toptan, Sağlık) */}
        <div id="cozumler">
          <Scene03Sectors />
        </div>

        {/* 04 · KREATİF REKLAM STÜDYOSU (Ürün Fotoğrafından Profesyonel Dikey Reklam) */}
        

        {/* 05 · ORTAK GELEN KUTUSU (Gelen Siparişler, Katalog Talepleri, Tek Ekrandan Satış) */}
        <div id="gelen-kutusu">
          <Scene05Inbox />
        </div>

        {/* 06 · KONTROL MERKEZİ (Gerçek Panel Ekranları) */}
        <Scene06Explorer />
        <div id="kreatif">
          <Scene04CreativeStudio />
        </div>

        {/* 07 · INFRASTRUCTURE BENTO (Teknik Altyapı, İzin Güvencesi & Çoklu Hat) */}
        <Scene07Bento />

        {/* 08 · TRUST + FAQ */}
        <div id="fiyatlandirma">
          <Scene08TrustFaq />
        </div>

        {/* 09 · FINAL CTA */}
        <Scene09FinalCta />
      </main>

      {/* Footer */}
      <Footer />
    </>
  )
}
