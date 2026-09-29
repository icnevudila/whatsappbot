import { HeroSection } from '@/components/hero/hero-section'
import { TruthStrip } from '@/components/truth-strip'
import { BeforeAfter } from '@/components/before-after'
import { CreativeEngine } from '@/components/creative-engine'
import { CreativeStudio } from '@/components/studio/creative-studio'
import { SectorLab } from '@/components/studio/sector-lab'
import { DeliveryEngine } from '@/components/delivery-engine'
import { ContactValidation } from '@/components/contact-validation'
import { InboxSection } from '@/components/inbox-section'
import { ProductExplorer } from '@/components/product-explorer'
import { BentoGrid } from '@/components/bento-grid'
import { MetricsBar } from '@/components/metrics-bar'
import { TrustSection } from '@/components/trust-section'
import { FaqSection } from '@/components/faq-section'
import { FinalCta } from '@/components/final-cta'
import { Footer } from '@/components/footer'

export default function Home() {
  return (
    <main>
      {/* Hero — "Reklamını oluştur. WhatsApp'tan ulaştır." */}
      <HeroSection />

      {/* Product Truth Strip — Journey: Stüdyo → Kampanya → WhatsApp → Yanıt → Inbox */}
      <TruthStrip />

      {/* Before / After — "5 farklı araç değil. Tek kampanya sistemi." */}
      <BeforeAfter />

      {/* Creative Engine — Scroll morph: Fotoğraf → Video → WhatsApp'a hazır */}
      <CreativeEngine />

      {/* AI Creative Studio — Dark section with 3 video cards */}
      <CreativeStudio />

      {/* Sector Lab — Interactive sector tabs with WhatsApp chat preview */}
      <SectorLab />

      {/* Delivery Engine — Multi-line routing diagram */}
      <DeliveryEngine />

      {/* Contact Validation — Excel import demo animation */}
      <ContactValidation />

      {/* Unified Inbox — Real screenshot with hotspots */}
      <InboxSection />

      {/* Product Explorer — Real application screenshots */}
      <ProductExplorer />

      {/* Technical Bento Grid — 4 power features */}
      <BentoGrid />

      {/* Metrics — Product facts: 100+ Sektör, 1.000 Senaryo, etc. */}
      <MetricsBar />

      {/* Trust / Control — Dark section */}
      <TrustSection />

      {/* FAQ — Accordion with 8 questions */}
      <FaqSection />

      {/* Final CTA — "Bir fotoğraftan müşteri konuşmasına." */}
      <FinalCta />

      {/* Footer */}
      <Footer />
    </main>
  )
}
