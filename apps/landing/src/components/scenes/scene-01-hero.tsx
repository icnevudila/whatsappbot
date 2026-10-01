'use client'

import { GeneratedMediaSlot } from '../visuals/generated-media-slot'
import { MesajifyMark } from '../brand/mesajify-mark'
import { replyExamples } from '../visuals/story-messages'
import { useSceneClock } from '../visuals/product-modules'

function HeroActivity(){const {ref,time,cycle}=useSceneClock(6);const beat=time<1.5?0:time<3?1:time<4.5?2:3;return <div ref={ref} className="ml-hero-activity" data-beat={beat}><div className="ml-hero-activity-message" key={cycle+"-"+beat}><span className="ml-activity-avatar">{beat<2?'M':'A'}</span><div><small>{beat<2?'ÖRNEK KAMPANYA':'ÖRNEK MÜŞTERİ YANITI'}</small><strong>{['Kampanya kitlesi hazır','Mesaj bağlı hatlara ilerliyor',replyExamples[(cycle+4)%replyExamples.length],'Yanıt ortak Gelen Kutusu’nda'][beat]}</strong></div><span>{beat===3?'✓':'↗'}</span></div></div>}
export function Scene01Hero() {
  return (
    <section className="ml-product-story ml-hero">
      <div className="ml-hero-copy">
        <p className="ml-hero-eyebrow">WhatsApp Kampanya Platformu</p>
        <h1>Birden fazla WhatsApp.<br />Tek kampanya paneli.</h1>
        <p className="ml-hero-lead">Hatlarınız, kampanyalarınız ve müşteri yanıtları tek panelde.</p>
        <p className="ml-hero-description">WhatsApp hatlarınızı bağlayın, kitlenizi hazırlayın ve kampanyanızı tek panelden yönetin. Farklı hatlara gelen müşteri yanıtlarını ortak Gelen Kutusu’nda takip edin.</p>
        <div className="ml-hero-actions">
          <a href="https://app.mesajify.com/giris">Hemen Başla →</a>
          <a href="#nasil-calisir">Nasıl Çalışır ↓</a>
        </div>
        <div className="ml-hero-steps"><span>Çoklu hat</span><span>Kampanya</span><span>Kitle</span><span>Tek Inbox</span></div>
      </div>
      <div className="ml-hero-visual" aria-label="Tek Mesajify panelinde kreatif, kitle, bağlı WhatsApp hatları ve Gelen Kutusu"><div className="ml-hero-film"><header><MesajifyMark variant="full" size="md" decorative/><span>Gerçek kampanya kreatifi</span></header><div className="ml-hero-film-content"><GeneratedMediaSlot id="real-product-video" alt="Bofe gerçek kampanya videosu"/><div className="ml-hero-film-story"><span className="ml-object-label">TEK KAMPANYA AKIŞI</span><h2>Kampanyadan<br/>konuşmaya.</h2><p>Kampanya + kitle</p><p>Bağlı WhatsApp hatları</p><div className="ml-hero-film-lines"><span>Hat 01</span><span>Hat 02</span><span>Hat 03</span></div><svg viewBox="0 0 240 90" aria-hidden="true"><path d="M30 5 C30 45 120 35 120 80 M120 5 V80 M210 5 C210 45 120 35 120 80" fill="none" stroke="currentColor" strokeWidth="1.5"/></svg><div className="ml-hero-film-inbox"><MesajifyMark size="md" decorative/><div><strong>Ortak Gelen Kutusu</strong><small>Yanıtlar tek panelde</small></div></div></div></div><HeroActivity/><footer>Bofe · mevcut gerçek video / Akış gösterimi örnektir</footer></div></div>
    </section>
  )
}
