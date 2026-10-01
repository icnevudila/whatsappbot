'use client'

import { GeneratedMediaSlot } from '../visuals/generated-media-slot'
import { MesajifyMark } from '../brand/mesajify-mark'
import { replyExamples } from '../visuals/story-messages'
import { useSceneClock } from '../visuals/product-modules'

function HeroActivity(){const {ref,time,cycle}=useSceneClock(6);const beat=time<1.5?0:time<3?1:time<4.5?2:3;return <div ref={ref} className="ml-hero-activity" data-beat={beat}><div className="ml-hero-activity-message" key={cycle+"-"+beat}><span className="ml-activity-avatar">{beat<2?'M':'A'}</span><div><small>{beat<2?'ÖRNEK TANITIM':'ÖRNEK MÜŞTERİ YANITI'}</small><strong>{['Tanıtım kitlesi hazır','Tanıtım mesajı hazır',replyExamples[(cycle+4)%replyExamples.length],'Yanıt ortak Gelen Kutusu’nda'][beat]}</strong></div><span>{beat===3?'✓':'↗'}</span></div></div>}
function HeroBusinessFlow(){const {ref,time,cycle}=useSceneClock(5);const phase=time<1?0:time<2.2?1:2;const examples=[['Restoran','Bugünkü menümüzü paylaşalım mı?','Menüyü görebilir miyim?'],['Kuaför','Hizmetlerimiz hakkında bilgi verelim mi?','Randevu alabilir miyim?'],['Toptancı','Ürün kataloğumuzu paylaşalım mı?','Kataloğunuzu gönderir misiniz?']];const item=examples[cycle%examples.length];return <div ref={ref} className="ml-business-flow" data-phase={phase}><svg viewBox="0 0 260 112" aria-hidden="true"><path d="M68 56H192" fill="none" stroke="#bdd8c7" strokeWidth="2"/><path d="M68 56H192" fill="none" stroke="#00a884" strokeWidth="5" pathLength="100" className="ml-business-packet"/><rect x="8" y="20" width="64" height="72" rx="12" fill="#fff" stroke="#bdd8c7"/><path d="M22 49V77H58V49M18 49l6-15h32l6 15M18 49q7 10 14 0q8 10 15 0q8 10 15 0M36 77V60h12v17" fill="none" stroke="#168347" strokeWidth="2" strokeLinejoin="round"/><rect x="188" y="20" width="64" height="72" rx="12" fill="#e4f5eb" stroke="#90c6a6"/><path d="M204 39h32v25h-15l-9 8v-8h-8zM211 47h18M211 55h13" fill="none" stroke="#168347" strokeWidth="2" strokeLinejoin="round"/></svg><div className="ml-business-flow-labels"><strong>{item[0]}</strong><strong>WhatsApp</strong></div><div key={cycle+'-'+phase} className="ml-business-flow-message"><span>{phase<2?'↗':'↙'}</span><p>{phase<2?item[1]:item[2]}</p></div></div>}
export function Scene01Hero() {
  return (
    <section className="ml-product-story ml-hero">
      <div className="ml-hero-copy">
        <h1>Civarınızdaki işletmelere<br />ürünlerinizi tanıtın.</h1>
        <p className="ml-hero-lead">Menünüzü, ürünlerinizi veya hizmetinizi WhatsApp’tan duyurun.</p>
        <p className="ml-hero-description">Kendi müşteri listenizi kullanın veya hedeflediğiniz bölge ve sektör için kitle talep edin. Tanıtım mesajınızı paylaşın; fiyat, ürün ve sipariş sorularını tek yerden yanıtlayın.</p>
        <div className="ml-hero-actions">
          <a href="https://app.mesajify.com/giris">Hemen Başla →</a>
          <a href="#kitle">Nasıl Çalışır ↓</a>
        </div>
        <div className="ml-hero-steps">
          <span>Hedef kitle</span>
          <span>Doğrudan WhatsApp Reklamı</span>
          <span>Müşteri yanıtları</span>
        </div>
      </div>
      <div className="ml-hero-visual" aria-label="Tek Mesajify panelinde kitle bulucu, kreatif reklam, WhatsApp tanıtımı ve Ortak Gelen Kutusu">
        <div className="ml-hero-film">
          <header>
            <MesajifyMark variant="full" size="md" decorative />
            
            
          </header>
          <div className="ml-hero-film-content">
            <GeneratedMediaSlot id="real-product-video" alt="Mesajify dikey tanıtım videosu" />
            <div className="ml-hero-film-story">
              
              
              <h2>Ürününüzü tanıtın.<br />Müşteri kazanın.</h2>
              <p>Hedef işletme ve kitle</p>
              <p>Ürününüzü tanıtan dikey reklam</p>
              <HeroBusinessFlow />
              <div className="ml-hero-film-inbox">
                <MesajifyMark size="md" decorative />
                <div>
                  <strong>Ortak Gelen Kutusu</strong>
                  <small>Gelen sipariş ve talepler tek panelde</small>
                </div>
              </div>
            </div>
          </div>
          <HeroActivity />
          
          
        </div>
      </div>
    </section>
  )
}
