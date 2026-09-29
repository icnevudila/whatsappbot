import { Navbar } from '@/components/navbar'
import { Scene01Hero } from '@/components/scenes/scene-01-hero'
import { Scene02CreativeStudio } from '@/components/scenes/scene-02-creative'
import { Scene03Sectors } from '@/components/scenes/scene-03-sectors'
import { Scene04Delivery } from '@/components/scenes/scene-04-delivery'
import { Scene05Inbox } from '@/components/scenes/scene-05-inbox'
import { Scene06Explorer } from '@/components/scenes/scene-06-explorer'
import { Scene07Bento } from '@/components/scenes/scene-07-bento'
import { Scene08TrustFaq } from '@/components/scenes/scene-08-trust-faq'
import { Scene09FinalCta } from '@/components/scenes/scene-09-final-cta'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <>
      {/* Fixed Navigation Shell */}
      <Navbar />

      <main className="w-full">
        {/* 01 · HERO / PRODUCT MOVIE */}
        <div id="urun">
          <Scene01Hero />
        </div>

        {/* 02 · CREATIVE STUDIO STORY (Dark) */}
        <div id="nasil-calisir">
          <Scene02CreativeStudio />
        </div>

        {/* 03 · SECTOR PLAYGROUND (Light) */}
        <div id="cozumler">
          <Scene03Sectors />
        </div>

        {/* 04 · CAMPAIGN DELIVERY STORY (Soft Neutral) */}
        <Scene04Delivery />

        {/* 05 · CUSTOMER REPLY → UNIFIED INBOX (Signature Moment) */}
        <Scene05Inbox />

        {/* 06 · REAL PRODUCT EXPLORER (High Density Live Screens) */}
        <Scene06Explorer />

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
