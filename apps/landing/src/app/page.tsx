import { Scene01Hero } from '@/components/scenes/scene-01-hero'
import { TrustBar } from '@/components/ui/trust-bar'
import { HowItWorksSimple } from '@/components/visuals/how-it-works-simple'
import {
  LandingSectorStory as Scene03Sectors,
  LandingCreativeStory as Scene04CreativeStudio,
  LandingDiscoveryStory as SceneDiscovery,
  LandingInboxStory as Scene05Inbox,
  LandingExplorerStory as Scene06Explorer,
} from '@/components/visuals/landing-product-story'
import { Scene07Bento } from '@/components/scenes/scene-07-bento'
import { Scene08TrustFaq } from '@/components/scenes/scene-08-trust-faq'
import { Scene09FinalCta } from '@/components/scenes/scene-09-final-cta'
import { Footer } from '@/components/footer'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

import './visual-lab/visual-lab.css'
import './visual-lab/v2.css'
import '@/components/visuals/landing-product-story.css'
import '@/components/visuals/campaign-control-center.css'
import '@/components/visuals/product-language.css'

export default function Home() {
  return (
    <>
      <main className="w-full">
        {/* 1. HERO */}
        <div id="urun">
          <Scene01Hero />
          <TrustBar />
        </div>

        {/* 2. SECTOR LAB (İnteraktif) */}
        <ScrollReveal>
          <div id="cozumler">
            <Scene03Sectors />
          </div>
        </ScrollReveal>

        {/* 3. 3 ADIMDA MESAJIFY */}
        <ScrollReveal>
          <div id="nasil-calisir">
            <HowItWorksSimple />
          </div>
        </ScrollReveal>

        {/* 4. BENTO GRID — 4 GÜÇ */}
        <ScrollReveal>
          <Scene07Bento />
        </ScrollReveal>

        {/* 5. KREATİF REKLAM STÜDYOSU */}
        <ScrollReveal>
          <div id="kreatif">
            <Scene04CreativeStudio />
          </div>
        </ScrollReveal>

        {/* 6. HEDEF KİTLE VE İŞLETME BULUCU */}
        <ScrollReveal>
          <div id="kitle">
            <SceneDiscovery />
          </div>
        </ScrollReveal>

        {/* 7. ORTAK GELEN KUTUSU */}
        <ScrollReveal>
          <div id="gelen-kutusu">
            <Scene05Inbox />
          </div>
        </ScrollReveal>

        {/* 8. UYGULAMA KONTROL MERKEZİ */}
        <ScrollReveal>
          <Scene06Explorer />
        </ScrollReveal>

        {/* 9. TRUST + FAQ */}
        <ScrollReveal>
          <div id="fiyatlandirma">
            <Scene08TrustFaq />
          </div>
        </ScrollReveal>

        {/* 10. FINAL CTA */}
        <ScrollReveal>
          <Scene09FinalCta />
        </ScrollReveal>
      </main>

      {/* Footer */}
      <Footer />
    </>
  )
}
