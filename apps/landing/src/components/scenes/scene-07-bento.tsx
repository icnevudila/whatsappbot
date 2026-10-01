'use client'

import { ConnectedLineDistribution } from '../visuals/campaign-control-center'
import { ProductBento } from '../visuals/product-modules'

export function Scene07Bento() {
  return <section className="ml-product-story ml-chapter-bento">
    <div className="ml-story-heading"><p>07 / TANITIMIN ARKASINDA</p><h2>Tanıtımınızın arkasındaki araçlar.</h2><div>Kitle hazırlığı, mesaj tanıtımı, kreatif desteği ve müşteri konuşmaları.</div></div>
    <div className="ml-preview-canvas"><ProductBento /></div>
    <details className="ml-advanced-lines">
      <summary>Birden fazla WhatsApp hattı kullanan ekipler için <span>Çoklu hat yönetimi ↗</span></summary>
      <div style={{ marginTop: '20px' }}>
        <ConnectedLineDistribution ready />
        <div style={{
          marginTop: '24px',
          borderRadius: '16px',
          border: '1px solid #dce5de',
          background: '#fff',
          overflow: 'hidden',
          boxShadow: '0 4px 18px rgba(0,0,0,0.04)',
        }}>
          <img
            src="/landing/infographics/03-coklu-hat-chatgpt-4-3.png"
            alt="Mesajify Çoklu Hat Yönetimi İnfografiği"
            loading="lazy"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>
      </div>
    </details>
  </section>
}
