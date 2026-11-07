'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUpRight, Check, ChevronDown, ImagePlus, Menu, MessageCircle, Pause, Play, Send, Users, X } from 'lucide-react';
import { MesajifyMark } from '../brand/mesajify-mark';
import { CampaignCinema, CampaignFilm, CreativeCinema, InboxCinema, SampleVideo } from './cinema';
import './premium-landing.css';

const login = 'https://app.mesajify.com/giris';
const examples = [
  { name: 'E-ticaret', file: 'ecommerce', description: 'Yeni koleksiyon. Yeni bir hikâye.' },
  { name: 'Yeme & içme', file: 'restaurant', description: 'Lezzeti ekrandan hissettirin.' },
  { name: 'Otomotiv', file: 'automotive', description: 'Vitrininizi harekete geçirin.' },
];
const questions = [
  ['Mesajify ile neler yapabilirim?', 'Kampanya görselleri ve kısa videolar hazırlayabilir, kitlelerinizi düzenleyebilir, WhatsApp gönderimlerini takip edebilir ve gelen yanıtları ekibinizle ortak gelen kutusunda yönetebilirsiniz.'],
  ['Kendi ürün fotoğraflarımı kullanabilir miyim?', 'Evet. Ürün fotoğraflarınızı ve marka bilgilerinizi ekleyerek Kreatif Stüdyosu ile kampanya içerikleri hazırlayabilirsiniz.'],
  ['Ekibimle birlikte kullanabilir miyim?', 'Ortak Gelen Kutusu, konuşmaları ekibinizle takip etmenizi ve ilgili ekip arkadaşınıza atamanızı sağlar.'],
  ['Gönderimden önce neyi kontrol etmeliyim?', 'Alıcıların iletişim izinlerini, mesaj içeriğini ve bağlı hesap ayarlarınızı kontrol edin. WhatsApp kuralları ve hesap koşulları gönderimlerinizi etkileyebilir.'],
  ['Paketleri ve kullanım haklarımı nereden görebilirim?', 'Hesabınıza giriş yaparak güncel paketleri, kullanım haklarınızı ve hesabınıza sunulan özellikleri inceleyebilirsiniz.'],
];

export function PremiumLanding() {
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [sector, setSector] = useState(0);
  useEffect(() => {
    const scroll = () => setScrolled(scrollY > 40);
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    scroll();
    addEventListener('scroll', scroll, { passive: true });
    addEventListener('keydown', key);
    return () => { removeEventListener('scroll', scroll); removeEventListener('keydown', key); };
  }, []);
  return <div className={`pm-page ${paused ? 'pm-paused' : ''}`}>
    <a className="pm-skip" href="#main">İçeriğe geç</a>
    <div className={`pm-nav-dock ${scrolled ? 'is-scrolled' : ''}`}><header className="pm-nav"><a href="#urun" aria-label="Mesajify ana sayfa"><MesajifyMark variant="full" size="sm" priority /></a><nav id="pm-navigation" className={menu ? 'is-open' : ''} aria-label="Ana menü">{[['Ürün', '#urun'], ['Nasıl çalışır?', '#nasil-calisir'], ['Örnekler', '#ornekler'], ['Sorularınız', '#sorular']].map(([label, href]) => <a href={href} key={href} onClick={() => setMenu(false)}>{label}</a>)}</nav><div className="pm-nav-actions"><a className="pm-login" href={login}>Giriş yap</a><a className="pm-button pm-button-small" href={login}>Hemen başlayın <ArrowUpRight /></a><button className="pm-menu" type="button" onClick={() => setMenu(!menu)} aria-label={menu ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={menu} aria-controls="pm-navigation">{menu ? <X /> : <Menu />}</button></div></header></div>
    <main id="main">
      <section className="pm-hero pm-wrap" id="urun"><div className="pm-hero-copy"><span className="pm-kicker"><i />WHATSAPP KAMPANYA PLATFORMU</span><h1>İçeriğinizi hazırlayın.<br /><span>WhatsApp’tan<br className="pm-hero-break" /> ulaştırın.</span></h1><p>Ürününüzü dikkat çeken bir kampanyaya dönüştürün.<br className="pm-desktop" /> Paylaşın, gelen yanıtları tek yerden yönetin.</p><div className="pm-hero-actions"><a href={login} className="pm-button">Hemen başlayın <ArrowUpRight /></a><a href="#nasil-calisir" className="pm-link">Nasıl çalışır? <ArrowDown /></a></div></div><CampaignFilm paused={paused} /></section>
      <div className="pm-capabilities pm-wrap"><span><ImagePlus />Kreatif Stüdyosu</span><i /><span><Users />Kitle Yönetimi</span><i /><span><Send />Kontrollü Gönderim</span><i /><span><MessageCircle />Ortak Gelen Kutusu</span></div>
      <div id="nasil-calisir" className="pm-tour-anchor" />
      <section className="pm-feature pm-wrap" id="kreatif"><div className="pm-feature-heading"><span className="pm-section-index">01 — OLUŞTURUN</span><h2>Bir fotoğrafla başlayın.<br />İçeriğiniz dikkat çeksin.</h2><p>Ürün fotoğrafınızı ekleyin. Markanıza uygun görseller<br className="pm-desktop" /> ve kısa videolarla ne sunduğunuzu gösterin.</p></div><CreativeCinema paused={paused} /><a href={login} className="pm-feature-link">Kreatif Stüdyosu’nu açın <ArrowUpRight /></a></section>
      <section className="pm-feature pm-wrap" id="kampanyalar"><div className="pm-feature-heading"><span className="pm-section-index">02 — ULAŞTIRIN</span><h2>İçeriğiniz hazır.<br />Şimdi doğru kişilere ulaştırın.</h2><p>İzinli kitlenizi seçin, mesajınızı önizleyin.<br className="pm-desktop" /> Gönderimlerinizi tek bir çalışma alanından takip edin.</p></div><CampaignCinema paused={paused} /><a href={login} className="pm-feature-link">İlk kampanyanızı hazırlayın <ArrowUpRight /></a></section>
      <section className="pm-feature pm-wrap" id="gelen-kutusu"><div className="pm-feature-heading"><span className="pm-section-index">03 — KONUŞMAYA DEVAM EDİN</span><h2>Bir mesajla başlasın.<br />Bir konuşmaya dönüşsün.</h2><p>Soruları kaçırmayın. Gelen yanıtları ekibinizle<br className="pm-desktop" /> birlikte görün, doğru kişiye yönlendirin.</p></div><InboxCinema paused={paused} /><a href={login} className="pm-feature-link">Ortak Gelen Kutusu’nu keşfedin <ArrowUpRight /></a></section>
      <section className="pm-examples" id="ornekler"><div className="pm-wrap"><div className="pm-examples-heading"><div><span className="pm-section-index">ÜRÜNÜNÜZ BAŞROLDE</span><h2>İşiniz ne olursa olsun.<br />Anlatacak bir hikâyeniz var.</h2></div><p>Mesajify için hazırlanmış<br />hareketli reklam örnekleri.</p></div><div className="pm-example-tabs" role="tablist" aria-label="Reklam sektörleri">{examples.map((example, index) => <button type="button" role="tab" id={`pm-tab-${index}`} key={example.file} aria-selected={sector === index} tabIndex={sector === index ? 0 : -1} aria-controls="pm-example-panel" onClick={() => setSector(index)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? examples.length - 1 : (sector + (event.key === 'ArrowRight' ? 1 : -1) + examples.length) % examples.length; setSector(next); document.getElementById(`pm-tab-${next}`)?.focus(); } }}>{example.name}<ArrowUpRight /></button>)}</div><div className="pm-example-panel" id="pm-example-panel" role="tabpanel" aria-labelledby={`pm-tab-${sector}`}><div className="pm-example-title"><span className="pm-kicker">{examples[sector].name}</span><h3>{examples[sector].description}</h3><p>Görseliniz, mesajınız ve markanız.<br />Müşterilerinize göstermek istediğiniz her şey.</p><a href={login} className="pm-link">Kendi içeriğinizi hazırlayın <ArrowUpRight /></a><small>Örnek reklam içeriği.</small></div><div className="pm-showreel"><SampleVideo key={examples[sector].file} sector={examples[sector].file} paused={paused} /><div className="pm-showreel-caption"><span>GÖRSEL + HAREKET + HİKÂYE</span><span>9:16</span></div></div><div className="pm-showreel-note"><span>FİKİRDEN<br />EKRANA.</span><ArrowDown /></div></div></div></section>
      <section className="pm-control pm-wrap"><div><span className="pm-section-index">KONTROL SİZDE</span><h2>Her adımı görün.<br />İçiniz rahat ilerleyin.</h2></div><div className="pm-control-items">{[['Önce önizleyin.', 'İçeriği ve mesajınızı göndermeden önce kontrol edin.'], ['Kitlenizi siz seçin.', 'İletişim izni bulunan kişilerinizle ilerleyin.'], ['Sonrasında takip edin.', 'Gönderim durumlarını ve konuşmaları aynı yerde görün.']].map(([title, text]) => <div key={title}><Check /><p><b>{title}</b><span>{text}</span></p></div>)}</div></section>
      <section className="pm-faq pm-wrap" id="sorular"><div><span className="pm-section-index">MERAK ETTİKLERİNİZ</span><h2>Aklınızda<br />soru kalmasın.</h2></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}</div></section>
      <section className="pm-final pm-wrap"><MesajifyMark size="lg" /><h2>İçeriğiniz burada.<br /><span>Sıradaki konuşmanız da.</span></h2><p>İlk kampanyanızı hazırlayın. Müşterilerinize bir merhaba deyin.</p><a className="pm-button" href={login}>Hemen başlayın <ArrowUpRight /></a></section>
    </main><footer className="pm-footer pm-wrap"><div><MesajifyMark variant="full" size="sm" /><p>İşletmenizi anlatın.<br />Konuşmayı başlatın.</p></div><div><a href="#kreatif">Kreatif Stüdyosu</a><a href="#kampanyalar">Kampanyalar</a><a href="#gelen-kutusu">Ortak Gelen Kutusu</a></div><div><a href="#ornekler">Örnek içerikler</a><a href="#sorular">Sorularınız</a><a href={login}>Giriş yap <ArrowUpRight /></a></div><div className="pm-footer-bottom"><span>© {new Date().getFullYear()} Mesajify</span><span>WhatsApp Kampanya Platformu</span><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}{paused ? 'Hareketleri oynat' : 'Hareketleri duraklat'}</button></div></footer>
  </div>;
}
