import { Scene01Hero } from '@/components/scenes/scene-01-hero'
import { LandingCampaignStory, LandingCreativeStory as Scene02CreativeStudio, LandingSectorStory as Scene03Sectors, LandingDeliveryStory as Scene04Delivery, LandingInboxStory as Scene05Inbox, LandingExplorerStory as Scene06Explorer } from '@/components/visuals/landing-product-story'
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
        {/* 01 · HERO / PRODUCT MOVIE */}
        <div id="urun">
          <Scene01Hero />
          <LandingCampaignStory />
        </div>

        <div id="nasil-calisir"><Scene04Delivery /></div>
        <div id="gelen-kutusu"><Scene05Inbox /></div>
        <Scene06Explorer />
        <div id="kreatif"><Scene02CreativeStudio /></div>
        <div id="cozumler"><Scene03Sectors /></div>

        {/* 07 · INFRASTRUCTURE BENTO (Architecture & Security) */}
        <Scene07Bento />

        {/* 08 · TRUST + FAQ (Dark) */}
        <div id="fiyatlandirma">
          <Scene08TrustFaq />
        </div>

        {/* 09 · FINAL CTA (Near Black) */}
        <Scene09FinalCta />
      </main>

      {/* Footer Shell */}
      <Footer />
    </>
  )
}
