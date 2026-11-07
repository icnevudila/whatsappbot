'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight, Check, CheckCheck, ChevronDown, Menu, X, Pause, Play, Users, ImagePlus, Send, MessageCircle, Paperclip, Search, SlidersHorizontal } from 'lucide-react';
import { MesajifyMark } from '../brand/mesajify-mark';
import './simple-landing.css';

const login = 'https://app.mesajify.com/giris';
const studio = '/landing/studio/';
const sectors = [
  { name: 'E-ticaret', file: 'ecommerce', title: 'Yeni koleksiyonunuz, müşterilerinizin cebinde.', source: 'ecommerce-flow-veo-poster.jpg' },
  { name: 'Yeme & içme', file: 'restaurant', title: 'Menünüzü iştah açan bir duyuruya dönüştürün.', source: 'restaurant-flow-veo-poster.jpg' },
  { name: 'Otomotiv', file: 'automotive', title: 'Vitrininizdeki yeniliği müşterilerinize gösterin.', source: 'automotive-flow-veo-poster.jpg' },
];
const steps = ['Kitlenizi seçin', 'İçeriği hazırlayın', 'Önizleyin', 'Yanıtları yönetin'];

function ProductFilm({ compact = false, paused }: { compact?: boolean; paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.15 });
    if (ref.current) observer.observe(ref.current);
    const timer = setInterval(() => {
      if (visible && !paused && !media.matches && !document.hidden) setStage(value => (value + 1) % 4);
    }, 3800);
    return () => { observer.disconnect(); clearInterval(timer); };
  }, [paused]);
  return <div className={`sl-film ${compact ? 'sl-film-compact' : ''}`} ref={ref}>
    <div className="sl-windowbar"><span className="sl-windowdots"><i /><i /><i /></span><span>Mesajify · Kampanya çalışma alanı</span><span className="sl-demo-label">Ürün anlatımı</span></div>
    <div className="sl-workspace">
      <aside className="sl-sidebar"><MesajifyMark size="xs" /><span className="sl-sidebar-label">ÇALIŞMA ALANINIZ</span>{[{ icon: Users, text: 'Kitleler' }, { icon: ImagePlus, text: 'İçerikler' }, { icon: Send, text: 'Kampanyalar' }, { icon: MessageCircle, text: 'Gelen kutusu' }].map(({ icon: Icon, text }, i) => <div key={text} className={stage === i ? 'is-active' : ''}><Icon size={17} /><span>{text}</span></div>)}<small>Her şey bir arada.</small></aside>
      <div className="sl-campaign">
        <div className="sl-campaign-top"><div><span className="sl-eyebrow">YENİ KAMPANYA</span><h3>Yeni sezon, yeni bir merhaba.</h3></div><span className="sl-status">Taslak</span></div>
        <div className="sl-stage" key={stage}>
          {stage === 0 && <><div className="sl-field-heading"><Users size={18} /><b>Kime ulaşmak istersiniz?</b></div><div className="sl-search"><Search size={16} />Kitlelerinizde arayın<SlidersHorizontal size={15} /></div>{['Yeni sezon listesi', 'Mağaza müşterileri', 'Bilgi almak isteyenler'].map((name, i) => <div className={`sl-audience-row ${i === 0 ? 'selected' : ''}`} key={name}><span className="sl-checkbox">{i === 0 && <Check size={12} />}</span><div><b>{name}</b><small>{i === 0 ? 'Bu kampanya için seçildi' : 'Kayıtlı kişi listesi'}</small></div><Users size={17} /></div>)}<p className="sl-hint">İletişim izni bulunan kişilerinizi seçin.</p></>}
          {stage === 1 && <><div className="sl-field-heading"><ImagePlus size={18} /><b>Bir fotoğraftan, yeni bir hikâye.</b></div><div className="sl-create-row"><Image width={720} height={1280} sizes="(max-width: 760px) 160px, 220px" src={`${studio}sources/nike_sneaker_raw.jpg`} alt="Örnek ürün fotoğrafı" /><ArrowRight size={25} /><Image width={720} height={1280} sizes="(max-width: 760px) 160px, 220px" src={`${studio}product-source-raw.jpg`} alt="Ürünü gösteren örnek reklam" /></div><div className="sl-complete"><Check size={15} />Görselinizi veya videonuzu kampanyaya ekleyin.</div></>}
          {stage === 2 && <><div className="sl-field-heading"><Send size={18} /><b>Göndermeden önce son bir bakış.</b></div><div className="sl-review"><span>Kitle<b>Yeni sezon listesi</b></span><span>İçerik<b>Video + mesaj</b></span><span>Gönderim<b>Kontrollü gönderim</b></span></div><div className="sl-example-button">Kampanya önizlemesi <ArrowUpRight size={16} /></div><p className="sl-hint">Bu sahne örnektir. Gerçek gönderim yapılmaz.</p></>}
          {stage === 3 && <><div className="sl-field-heading"><MessageCircle size={18} /><b>Bir merhaba, yeni bir konuşma.</b></div><div className="sl-inbox-item"><span className="sl-avatar">A</span><div><b>Ayşe · Yeni mesaj</b><p>Merhaba, farklı renkleri de var mı?</p></div><i /></div><div className="sl-reply-note">Ortak Gelen Kutusu <ArrowRight size={15} /> Satış ekibi</div><div className="sl-complete"><Check size={15} />Konuşmayı ekibinizle birlikte yönetin.</div></>}
        </div>
        <div className="sl-film-steps" aria-label="Ürün anlatım adımları">{steps.map((text, i) => <button key={text} type="button" onClick={() => setStage(i)} aria-pressed={stage === i}><span>{i + 1}</span><b>{text}</b></button>)}</div>
      </div>
      <div className="sl-phone-wrap"><span className="sl-phone-caption">Müşterinizin ekranında</span><div className="sl-phone"><div className="sl-phone-head"><span className="sl-shop-icon">m</span><div>Mağazanız<small>İşletme hesabı</small></div><span>···</span></div><div className="sl-phone-body"><span className="sl-chat-date">Örnek konuşma</span><div className="sl-chat-bubble"><Image width={720} height={1280} sizes="(max-width: 760px) 160px, 220px" src={`${studio}product-source-raw.jpg`} alt="WhatsApp mesajındaki örnek ürün reklamı" /><p>Yeni sezon geldi. ✨<br />Koleksiyonumuzu sizinle paylaşmak istedik.</p><small>10:42 <CheckCheck size={13} /></small></div>{stage === 3 && <div className="sl-incoming">Merhaba, farklı renkleri de var mı?<small>10:43</small></div>}</div><div className="sl-phone-input"><span>Mesaj</span><Paperclip size={15} /></div></div></div>
    </div>
    <div className="sl-film-caption"><span>Kitleden konuşmaya. Tek bir çalışma alanında.</span><span>Temsili ürün akışı</span></div>
  </div>;
}

function VideoSample({ file, paused }: { file: string; paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => {
      if (visible && !paused && !media.matches && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: 0.35 });
    observer.observe(video);
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); video.pause(); media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [paused]);
  return <div className="sl-video-sample"><video key={file} ref={ref} src={`${studio}${file}-flow-veo.mp4`} poster={`${studio}${file}-flow-veo-poster.jpg`} muted loop playsInline preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Mesajify ile hazırlanmış örnek reklam videosu" /><button type="button" aria-label={playing ? 'Örnek videoyu duraklat' : 'Örnek videoyu oynat'} onClick={() => { if (ref.current?.paused) ref.current.play().catch(() => {}); else ref.current?.pause(); }}>{playing ? <Pause size={17} /> : <Play size={17} />}</button></div>;
}

export function SimpleLanding() {
  const [menu, setMenu] = useState(false);
  const [paused, setPaused] = useState(false);
  const [sector, setSector] = useState(0);
  const chosen = sectors[sector];
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); }; document.addEventListener('keydown', close); return () => document.removeEventListener('keydown', close); }, []);
  return <div className={`sl-page ${paused ? 'sl-paused' : ''}`}>
    <a className="sl-skip" href="#sl-main">İçeriğe geç</a>
    <header className="sl-header"><a href="#urun" aria-label="Mesajify ana sayfa"><MesajifyMark variant="full" size="sm" priority /></a><nav aria-label="Ana menü" className={menu ? 'sl-nav is-open' : 'sl-nav'} id="sl-navigation">{[['Neler yapabilirsiniz?', '#cozumler'], ['Nasıl çalışır?', '#nasil-calisir'], ['Örnekler', '#kreatif'], ['Sorularınız', '#sorular']].map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}</nav><a className="sl-header-login" href={login}>Giriş yap <ArrowUpRight size={15} /></a><button type="button" className="sl-menu" aria-label={menu ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={menu} aria-controls="sl-navigation" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></header>
    <main id="sl-main">
      <section className="sl-hero sl-wrap" id="urun"><div className="sl-hero-copy"><span className="sl-eyebrow">WHATSAPP KAMPANYA PLATFORMU</span><h1>Kampanyanızı hazırlayın.<br />Müşterilerinize ulaşın.</h1><p>İçeriğinizi oluşturun, WhatsApp’tan paylaşın.<br className="sl-desktop-break" /> Gelen yanıtları ekibinizle tek yerden yönetin.</p><div className="sl-actions"><a className="sl-button" href={login}>Hemen başlayın <ArrowUpRight size={18} /></a><a className="sl-text-link" href="#nasil-calisir">Nasıl çalışır? <ArrowRight size={17} /></a></div></div><ProductFilm paused={paused} /><div className="sl-under-film"><span>Hazırlayın. Paylaşın. Konuşmaya devam edin.</span><button type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? <Play size={14} /> : <Pause size={14} />}{paused ? 'Hareketleri oynat' : 'Hareketleri duraklat'}</button></div></section>
      <div className="sl-principles sl-wrap"><span><ImagePlus size={20} />İçerik oluşturma</span><span><Users size={20} />Kitle yönetimi</span><span><Send size={20} />Kontrollü gönderim</span><span><MessageCircle size={20} />Ortak Gelen Kutusu</span></div>
      <section className="sl-section sl-wrap" id="cozumler"><div className="sl-section-heading"><h2>Bir kampanya için<br />ihtiyacınız olanlar.</h2><p>Farklı işler arasında kaybolmayın.<br />Her adımı aynı yerden tamamlayın.</p></div><div className="sl-services">
        <article className="sl-service"><div className="sl-service-copy"><span>01 / KİTLE</span><h3>Doğru listeyle başlayın.</h3><p>Kişilerinizi bir araya getirin. Kampanyanız için uygun, izinli kitlenizi seçin.</p></div><div className="sl-list-art"><div className="sl-art-toolbar"><Users size={17} /><b>Kampanya kitleniz</b><span>Seçildi</span></div>{['Yeni sezon listesi', 'Mağaza müşterileri', 'Bilgi almak isteyenler'].map((text, i) => <div key={text} style={{ animationDelay: `${i * 200}ms` }}><span className="sl-letter-avatar">{text[0]}</span><b>{text}</b><Check size={17} /></div>)}<small>İletişim izinleriyle birlikte, düzenli bir liste.</small></div></article>
        <article className="sl-service"><div className="sl-service-copy"><span>02 / İÇERİK</span><h3>Ürününüzü hikâyeye dönüştürün.</h3><p>Ürün fotoğrafınızdan görsel ve kısa video hazırlayın. Mesajınızla birlikte paylaşın.</p></div><div className="sl-creative-art"><Image width={720} height={1280} sizes="(max-width: 760px) 160px, 220px" src={`${studio}sources/nike_sneaker_raw.jpg`} alt="Başlangıçtaki ürün fotoğrafı" loading="lazy" /><span><ArrowRight size={23} /></span><Image width={720} height={1280} sizes="(max-width: 760px) 160px, 220px" src={`${studio}product-source-raw.jpg`} alt="Örnek kampanya kreatifi" loading="lazy" /><small>Ürün fotoğrafı</small><small>Kampanya içeriği</small></div></article>
        <article className="sl-service"><div className="sl-service-copy"><span>03 / KAMPANYA</span><h3>Önce görün. Sonra paylaşın.</h3><p>Kitlenizi ve mesajınızı kontrol edin. Gönderim durumlarını panelinizden takip edin.</p></div><div className="sl-send-art"><div><Send size={20} /><b>Yeni sezon duyurusu</b><span>Önizleme</span></div><p>Yeni koleksiyonumuz hazır. Detayları sizinle paylaşmak istedik.</p><footer><span><Check size={15} />Kitle seçildi</span><span><Check size={15} />İçerik eklendi</span></footer><div className="sl-send-line"><i /><i /><i /><i /><i /></div></div></article>
        <article className="sl-service" id="gelen-kutusu"><div className="sl-service-copy"><span>04 / KONUŞMA</span><h3>Her yanıta birlikte yetişin.</h3><p>Gelen soruları ortak kutuda görün. Konuşmaları ekip arkadaşlarınıza atayın.</p></div><div className="sl-chat-art"><div><span className="sl-letter-avatar">A</span><b>Ayşe</b><small>Satış ekibine atandı</small></div><p>Merhaba, ürün hakkında bilgi alabilir miyim?</p><p>Elbette, memnuniyetle yardımcı oluruz. <CheckCheck size={15} /></p></div></article>
      </div></section>
      <section className="sl-how" id="nasil-calisir"><div className="sl-wrap"><div className="sl-section-heading"><h2>Fikirden ilk mesaja.</h2><p>Birbirini tamamlayan dört adım.<br />Başından sonuna, Mesajify’da.</p></div><ProductFilm paused={paused} compact /><p className="sl-note">Temsili akış. Gönderim öncesinde içerik, alıcı izinleri ve hesap ayarları sizin kontrolünüzdedir.</p></div></section>
      <section className="sl-section sl-wrap sl-creative-section" id="kreatif"><div className="sl-section-heading"><h2>Sizin ürününüz.<br />Sizin hikâyeniz.</h2><p>Bir fotoğrafla başlayın.<br />Müşterilerinize gösterecek bir şeyiniz olsun.</p></div><div className="sl-sector-tabs" role="tablist" aria-label="Örnek reklam sektörleri">{sectors.map((item, i) => <button type="button" role="tab" id={`sector-tab-${i}`} aria-controls="sector-panel" tabIndex={sector === i ? 0 : -1} aria-selected={sector === i} key={item.file} onClick={() => setSector(i)} onKeyDown={event => { if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? sectors.length - 1 : (sector + (event.key === 'ArrowRight' ? 1 : -1) + sectors.length) % sectors.length; setSector(next); document.getElementById(`sector-tab-${next}`)?.focus(); } }}>{item.name}</button>)}</div><div className="sl-sector-panel" role="tabpanel" id="sector-panel" aria-labelledby={`sector-tab-${sector}`}><div className="sl-sector-copy"><span className="sl-eyebrow">KREATİF STÜDYOSU</span><h3>{chosen.title}</h3><p>Ürününüzü ekleyin, ne anlatmak istediğinizi yazın. Görsel veya video içeriğinizi hazırlayıp kampanyanızda kullanın.</p><a className="sl-text-link" href={login}>İçeriğinizi hazırlayın <ArrowUpRight size={17} /></a><span className="sl-sample-note">Görsel ve video örnekleri. Temsili sunum.</span></div><div className="sl-sector-source"><Image width={720} height={1280} sizes="(max-width: 760px) 160px, 220px" src={`${studio}${chosen.source}`} alt={`${chosen.name} örnek kaynak fotoğrafı`} loading="lazy" /><span>Örnek görsel</span></div><ArrowRight className="sl-sector-arrow" size={26} /><VideoSample key={chosen.file} file={chosen.file} paused={paused} /></div></section>
      <section className="sl-control-section"><div className="sl-wrap sl-control-grid"><div><span className="sl-eyebrow">KONTROL SİZDE</span><h2>Paylaşmadan önce netlik.<br />Paylaştıktan sonra görünürlük.</h2></div><div><p>İçeriğinizi önizleyin. İzinli kitlenizi seçin. Gönderim durumlarını ve gelen yanıtları aynı panelden izleyin.</p><a href={login} className="sl-text-link">Çalışma alanınıza geçin <ArrowUpRight size={17} /></a></div></div></section>
      <section className="sl-section sl-wrap sl-faq" id="sorular"><h2>Aklınızdaki sorular.</h2><div>{[
        ['Mesajify ile neler yapabilirim?', 'Kitlelerinizi düzenleyebilir, kampanya içeriği hazırlayabilir, WhatsApp gönderimlerinizi takip edebilir ve gelen yanıtları ortak gelen kutusunda yönetebilirsiniz.'],
        ['Kendi görsellerimi kullanabilir miyim?', 'Evet. Ürün görsellerinizi kullanabilir veya Kreatif Stüdyosu ile kampanyanız için görsel ve kısa video içerikleri hazırlayabilirsiniz.'],
        ['Ekibimle birlikte kullanabilir miyim?', 'Ortak Gelen Kutusu ile konuşmaları birlikte takip edebilir ve ilgili ekip arkadaşınıza atayabilirsiniz.'],
        ['Mesaj göndermeden önce neyi kontrol etmeliyim?', 'Alıcıların iletişim izinlerini, mesaj içeriğini ve bağlı hesap ayarlarınızı kontrol edin. WhatsApp kuralları ve hesap koşulları gönderimlerinizi etkileyebilir.'],
        ['Paket ve kullanım bilgilerini nereden görebilirim?', 'Hesabınıza giriş yaparak güncel paket, kullanım ve hesabınıza sunulan özellikleri inceleyebilirsiniz.'],
      ].map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown size={19} /></summary><p>{answer}</p></details>)}</div></section>
      <section className="sl-final sl-wrap"><MesajifyMark size="md" /><h2>Bir sonraki kampanyanız<br />buradan başlasın.</h2><p>İçeriğiniz, kitleniz ve konuşmalarınız. Bir arada.</p><a href={login} className="sl-button">Hemen başlayın <ArrowUpRight size={18} /></a></section>
    </main><footer className="sl-footer sl-wrap"><a href="#urun" aria-label="Mesajify ana sayfa"><MesajifyMark variant="full" size="sm" /></a><span>WhatsApp Kampanya Platformu</span><div><a href="#sorular">Sorularınız</a><a href={login}>Giriş yap <ArrowUpRight size={14} /></a><span>© {new Date().getFullYear()} Mesajify</span></div></footer>
  </div>;
}
