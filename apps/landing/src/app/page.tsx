import { Scene01Hero } from '@/components/scenes/scene-01-hero'
import { HowItWorksSimple } from '@/components/visuals/how-it-works-simple'
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

        {/* 02 · NASIL ÇALIŞIR: 3 Kolay Adımda Mesajify (Kreatif → Dağıtım → Satış) */}
        <div id="nasil-calisir">
          <HowItWorksSimple />
        </div>

        {/* 03 · KREATİF REKLAM STÜDYOSU (Ürün Fotoğrafından Dikey Video Reklam) */}
        <div id="kreatif">
          <Scene04CreativeStudio />
        </div>

        {/* 04 · SEKTÖRÜNÜZDE ÖNE ÇIKIN (Kuaför, Kafe, Restoran, E-Ticaret, Sağlık) */}
        <div id="cozumler">
          <Scene03Sectors />
        </div>

        {/* 05 · ORTAK GELEN KUTUSU (Gelen Siparişler, Satış ve Yanıt Yönetimi) */}
        <div id="gelen-kutusu">
          <Scene05Inbox />
        </div>

        {/* 06 · UYGULAMA KONTROL MERKEZİ (Gerçek Panel Ekranları) */}
        <Scene06Explorer />

        {/* 07 · MÜŞTERİ REHBERİ (İsteğe Bağlı Kitle & Liste Yönetimi) */}
        <div id="rehber">
          <Scene02LeadAndAudience />
        </div>

        {/* 08 · INFRASTRUCTURE BENTO (Teknik Altyapı, İzin Güvencesi & Çoklu Hat) */}
        <Scene07Bento />

        {/* 09 · TRUST + FAQ */}
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
