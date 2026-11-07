'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, ChevronDown, Menu, Pause, Play, X } from 'lucide-react';
import { MesajifyMark } from '../brand/mesajify-mark';
import './veriburada-landing.css';

const login = 'https://app.mesajify.com/giris';
const questions = [
  ['Mesajify tam olarak ne yapıyor?', 'Kampanya görselleri ve kısa videolar hazırlamanızı, kitlenizi düzenlemenizi, WhatsApp gönderimlerini takip etmenizi ve gelen yanıtları ekibinizle ortak gelen kutusunda yönetmenizi sağlar.'],
  ['Kendi ürün fotoğraflarımı kullanabilir miyim?', 'Evet. Ürün fotoğraflarınızı ve marka bilgilerinizi ekleyerek Kreatif Stüdyosu ile kampanya içerikleri hazırlayabilirsiniz.'],
  ['Mesaj göndermek için neye ihtiyacım var?', 'Bağlı WhatsApp hesabınızı, mesajınızı ve alıcı listenizi hazırlayın. Gönderim öncesinde alıcıların iletişim izinlerini ve hesap ayarlarınızı kontrol edin.'],
  ['Ekibimle birlikte kullanabilir miyim?', 'Evet. Gelen konuşmaları ortak gelen kutusunda görebilir, ekip arkadaşlarınıza atayabilir ve yanıtları aynı çalışma alanından takip edebilirsiniz.'],
  ['Paketleri ve kullanım haklarımı nereden görebilirim?', 'Hesabınıza giriş yaparak güncel paketleri, kullanım haklarınızı ve hesabınıza sunulan özellikleri inceleyebilirsiniz.'],
  ['Hazırladığım içeriği göndermeden görebilir miyim?', 'Kampanya içeriğini, mesajınızı ve alıcı kitlenizi gönderim öncesinde önizleyerek kontrol edebilirsiniz.'],
];

const chapters = ['İçeriğinizi hazırlayın', 'Kitlenizi seçin', 'Mesajınızı ulaştırın', 'Konuşmaya devam edin'];
const useCases = [
  { title: 'Mağaza & e-ticaret', heading: 'Yeni koleksiyonunuza bir merhaba.', message: 'Yeni koleksiyonumuz hazır. Renkleri ve modelleri incelemek isterseniz bize yazabilirsiniz.', reply: 'Merhaba, farklı renklerini görebilir miyim?', team: 'Satış ekibi' },
  { title: 'Yeme & içme', heading: 'Günün menüsü, müşterilerinizle.', message: 'Bugünün menüsü hazır. Sevdiklerinizle güzel bir mola için sizi bekliyoruz.', reply: 'Merhaba, akşam için yer ayırabilir miyiz?', team: 'Rezervasyon ekibi' },
  { title: 'Hizmet işletmeleri', heading: 'Hizmetinizi anlatın. Soruları yanıtlayın.', message: 'İşletmenize sunduğumuz hizmetleri sizinle paylaşmak istedik. Ayrıntıları konuşmak için bize yazabilirsiniz.', reply: 'Merhaba, ayrıntılı bilgi alabilir miyim?', team: 'Müşteri ilişkileri' },
];

function ConnectionFlow({ paused }: { paused: boolean }) {
  return <div className={`vb-flow ${paused ? 'is-paused' : ''}`} role="img" aria-label="Kampanya içeriğiniz ve izinli kitleniz Mesajify’de birleşir. WhatsApp mesajı müşterinize ulaşır, yanıtlar ortak gelen kutunuza gelir. Temsili akış.">
    <div className="vb-flow-inputs"><div><small>İçeriğiniz</small><strong>Görsel + mesaj</strong><Check /></div><div><small>Kitleniz</small><strong>İzinli kişileriniz</strong><Check /></div></div>
    <div className="vb-flow-path"><i /><i /><i /></div>
    <div className="vb-flow-brand"><MesajifyMark size="lg" /><span>Mesajify</span></div>
    <div className="vb-flow-path vb-flow-path-out"><i /><i /><i /></div>
    <div className="vb-flow-output"><header>WhatsApp kampanyanız <Check /></header><div><span>Mesajınız ulaştı.</span><small>Gönderim Görünürlüğü</small></div><div><span>Yeni bir yanıtınız var.</span><small>Ortak Gelen Kutusu</small></div></div>
  </div>;
}

function UseCases() {
  const [selected, setSelected] = useState(0);
  const item = useCases[selected];
  return <section className="vb-usecases vb-section vb-wrap" id="kullanim-alanlari">
    <div className="vb-heading"><h2>İşiniz ne olursa olsun.<br />Konuşacak çok şeyiniz var.</h2><p>Yeni bir ürün, günün menüsü veya sunduğunuz bir hizmet.<br />Mesajınızı hazırlayın, müşterilerinizle buluşturun.</p></div>
    <div className="vb-usecase-tabs" role="tablist" aria-label="Kampanya kullanım alanları">{useCases.map((entry, index) => <button type="button" role="tab" id={`vb-case-${index}`} aria-controls="vb-case-panel" aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} key={entry.title} onClick={() => setSelected(index)} onKeyDown={event => {
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? useCases.length - 1 : (selected + (event.key === 'ArrowRight' ? 1 : -1) + useCases.length) % useCases.length;
        setSelected(next); document.getElementById(`vb-case-${next}`)?.focus();
      }
    }}>{entry.title}</button>)}</div>
    <div className="vb-usecase-panel" id="vb-case-panel" role="tabpanel" aria-labelledby={`vb-case-${selected}`}><div><h3>{item.heading}</h3><p>İçeriğinizi paylaşın.<br />Gelen soruları doğru ekibe yönlendirin.</p><a className="vb-text-link" href={login}>Kendi kampanyamı hazırla <ArrowRight /></a></div><div className="vb-example-chat"><header><MesajifyMark size="sm" /><span>İşletmenizden bir mesaj</span></header><div className="vb-example-sent">{item.message}<small>14:32 ✓✓</small></div><div className="vb-example-reply">{item.reply}<small>14:34</small></div><footer><Check />{item.team}<span>Ortak Gelen Kutusu</span></footer></div></div>
    <p className="vb-example-note">Temsili mesaj ve konuşma örnekleri.</p>
  </section>;
}

function Film({ name, label, paused, priority = false, interactive = false }: { name: string; label: string; paused: boolean; priority?: boolean; interactive?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const manualPlay = useRef(false);
  const [localPaused, setLocalPaused] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(0);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const compact = matchMedia('(max-width: 760px)');
    let visible = false;
    const sync = () => {
      if (visible && !paused && !localPaused && (!reduced.matches || manualPlay.current) && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .15 });
    const resize = () => {
      const time = video.currentTime;
      setReady(false);
      video.addEventListener('loadedmetadata', () => { video.currentTime = time; sync(); }, { once: true });
      video.load();
    };
    observer.observe(video);
    reduced.addEventListener('change', sync);
    compact.addEventListener('change', resize);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); reduced.removeEventListener('change', sync); compact.removeEventListener('change', resize); document.removeEventListener('visibilitychange', sync); };
  }, [paused, localPaused]);
  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      manualPlay.current = true;
      setLocalPaused(false);
      video.play().catch(() => {});
    } else {
      manualPlay.current = false;
      setLocalPaused(true);
      video.pause();
    }
  };
  const selectChapter = (index: number) => {
    const video = ref.current;
    if (!video) return;
    const seek = () => { video.currentTime = index * 4 + 2.8; setReady(true); };
    if (video.readyState >= 1) seek();
    else {
      video.preload = 'auto';
      video.addEventListener('loadedmetadata', seek, { once: true });
      video.load();
    }
    setChapter(index);
  };
  return <div className="vb-film-group">
    <div className="vb-film">
      <picture className={`vb-film-poster ${ready ? 'is-ready' : ''}`}>
        <source media="(max-width: 760px)" srcSet={`/landing/veriburada-style/${name}-mobile-poster.jpg`} />
        <Image src={`/landing/veriburada-style/${name}-poster.jpg`} alt="" width={1200} height={760} unoptimized loading={priority ? 'eager' : 'lazy'} />
      </picture>
      <video ref={ref} width={1200} height={760} muted playsInline loop preload={priority ? 'auto' : 'none'} poster={`/landing/veriburada-style/${name}-poster.jpg`} aria-label={label}
        onPlaying={() => { setReady(true); setPlaying(true); }} onPause={() => setPlaying(false)} onError={() => { setReady(false); setPlaying(false); }}
        onTimeUpdate={interactive ? event => setChapter(Math.min(3, Math.floor(event.currentTarget.currentTime / 4))) : undefined}>
        <source media="(max-width: 760px)" src={`/landing/veriburada-style/${name}-mobile.mp4`} type="video/mp4" />
        <source src={`/landing/veriburada-style/${name}.mp4`} type="video/mp4" />
      </video>
      <button type="button" disabled={paused} aria-label={playing ? 'Ürün filmini duraklat' : 'Ürün filmini oynat'} aria-pressed={!playing} onClick={toggle}>{playing ? <Pause /> : <Play />}</button>
    </div>
    {interactive && <div className="vb-steps" aria-label="Ürün filminin bölümleri">{chapters.map((text, index) => <button key={text} type="button" aria-pressed={chapter === index} onClick={() => selectChapter(index)}><span>0{index + 1}</span><strong>{text}</strong></button>)}</div>}
  </div>;
}

export function VeriburadaLanding() {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 35);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    scroll(); window.addEventListener('scroll', scroll, { passive: true }); window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('scroll', scroll); window.removeEventListener('keydown', escape); };
  }, []);
  return <div className="vb-page" id="sayfa-basi">
    <a className="vb-skip" href="#main">İçeriğe geç</a>
    <div className="vb-dock"><header className={`vb-header ${scrolled ? 'is-scrolled' : ''} ${menu ? 'menu-open' : ''}`}><a href="#sayfa-basi" aria-label="Mesajify ana sayfa"><MesajifyMark variant="full" size="md" priority /></a><nav id="vb-nav" className={menu ? 'is-open' : ''} aria-label="Ana menü">{[['Hizmetler', '#hizmetler'], ['Nasıl çalışır?', '#nasil-calisir'], ['Özellikler', '#ozellikler'], ['Paketler', '#paketler']].map(([label, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{label}</a>)}</nav><a className="vb-header-start" href={login}>Hemen başla</a><button className="vb-menu" aria-label={menu ? 'Menüyü kapat' : 'Menüyü aç'} aria-controls="vb-nav" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></header></div>
    <main id="main">
      <section className="vb-hero vb-wrap" id="urun"><div className="vb-hero-copy"><h1>İçeriğinizi hazırlayın.<br /><span>Konuşmayı başlatın.</span></h1><p>Görselinizi ve mesajınızı hazırlayın. WhatsApp’tan ulaştırın, gelen yanıtları tek yerden yönetin.</p><a className="vb-button" href={login}>İlk kampanyamı oluştur</a></div><Film name="overview" label="Ürün görselinden kampanyaya, izinli kitle seçiminden WhatsApp mesajı ve gelen yanıta uzanan temsili Mesajify akışı." paused={paused} priority /></section>
      <section className="vb-facts vb-wrap" aria-label="Mesajify ile yapabilecekleriniz">{[['Görsel + video', 'Markanıza uygun içerikler'], ['WhatsApp', 'Müşterilerinize ulaşın'], ['Tek panel', 'Gönderimleri takip edin'], ['Birlikte', 'Yanıtları ekibinizle yönetin']].map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}</section>
      <section className="vb-services vb-wrap vb-section" id="hizmetler"><h2 className="vb-sr">Hizmetlerimiz</h2><div className="vb-services-grid"><article><div className="vb-service-copy"><h3>İçeriğiniz dikkat çeksin.</h3><p>Ürün fotoğrafınızı ekleyin. Görselinizi ve kısa videonuzu markanızla hazırlayın.</p></div><Film name="creative" label="Özgün kahve ürün çiziminin markalı kampanya tasarımına dönüşümünü gösteren yeni ürün filmi." paused={paused} /><a href={login} className="vb-service-link">Kreatif Stüdyosu’nu keşfet <ArrowRight /></a></article><article><div className="vb-service-copy"><h3>Mesajınızı ulaştırın.</h3><p>İzinli kitlenizi seçin. Mesajınızı önizleyin, gönderiminizi takip edin.</p></div><Film name="send" label="İzinli üç kişilik temsili kitleye hazırlanan WhatsApp kampanyası ve gönderim durumlarının anlatımı." paused={paused} /><a href={login} className="vb-service-link">İlk kampanyamı oluştur <ArrowRight /></a></article></div></section>
      <section className="vb-workflow vb-section" id="nasil-calisir"><div className="vb-wrap"><div className="vb-heading"><h2>Mesajify nasıl çalışır?</h2><p>Siz ne anlatmak istediğinizi seçin.<br />İçeriğiniz kampanyaya, mesajınız konuşmaya dönüşsün.</p></div><Film name="overview" label="Mesajify nasıl çalışır: içerik hazırlama, kitle seçimi, WhatsApp gönderimi ve ortak gelen kutusu." paused={paused} interactive /></div></section>
      <section className="vb-section vb-wrap"><div className="vb-heading"><h2>İçerikten müşteriye.<br />Tek bir akışta.</h2><p>İçeriğiniz ve kitleniz bir araya gelsin.<br />Mesajınız müşterinize, yanıtı ekibinize ulaşsın.</p></div><ConnectionFlow paused={paused} /></section>
      <section className="vb-section vb-wrap" id="ozellikler"><div className="vb-heading"><h2>Gelen her yanıt.<br />Aynı çalışma alanında.</h2><p>Müşterilerinizin sorularını kaçırmayın.<br />Konuşmaları ekibinizle görün, birlikte yanıtlayın.</p></div><Film name="inbox" label="Ayşe, Mehmet ve Elif adlı temsili müşterilerin yanıtlarının ortak gelen kutusunda yönetilmesini gösteren özgün film." paused={paused} /><a href={login} className="vb-service-link">Ortak Gelen Kutusu’nu keşfet <ArrowRight /></a></section>
      <section className="vb-section vb-wrap vb-preview" id="kampanya"><div><h2>Göndermeden önce<br />her şeyi görün.</h2><p>İçeriğiniz, mesajınız ve kitleniz.<br />Kampanyanızın her adımı kontrolünüzde.</p><a href={login} className="vb-text-link">Kampanyamı hazırla <ArrowRight /></a></div><div className="vb-checklist"><header><MesajifyMark size="sm" /><strong>Kampanyanız hazır mı?</strong></header>{[['İçeriğiniz', 'Görsel ve mesaj önizlemesi'], ['Kitleniz', 'İletişim izni bulunan kişiler'], ['Gönderiminiz', 'Bağlı hesap ve kampanya ayarları']].map(([title, desc]) => <div key={title}><span><b>{title}</b><small>{desc}</small></span><Check /></div>)}<footer>Önizleyin. Kontrol edin. Ulaştırın.</footer></div></section>
      <UseCases />
      <section className="vb-packages vb-section" id="paketler"><div className="vb-wrap"><div className="vb-heading"><h2>İşinize uygun bir başlangıç.</h2><p>İçerik hazırlamadan müşteri konuşmalarına.<br />İhtiyacınız olan araçları tek yerde keşfedin.</p></div><div className="vb-package-card"><div><h3>Mesajify çalışma alanınız</h3><p>Güncel paketleri ve kullanım haklarınızı<br />hesabınızdan inceleyin.</p><a className="vb-button" href={login}>Paketleri incele <ArrowRight /></a></div><ul>{['Kreatif Stüdyosu', 'Kitle Yönetimi', 'Kampanya Kontrol Merkezi', 'Ortak Gelen Kutusu'].map(text => <li key={text}><Check />{text}</li>)}</ul></div></div></section>
      <section className="vb-faq vb-wrap vb-section" id="sorular"><div><h2>Sık sorulan sorular</h2><a className="vb-text-link" href={login}>Mesajify hesabınızı açın</a></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}</div></section>
      <section className="vb-closing vb-section"><MesajifyMark size="lg" /><h2>İçeriğiniz burada.<br /><span>Sıradaki konuşmanız da.</span></h2><p>İlk kampanyanızı hazırlayın. Müşterilerinize bir merhaba deyin.</p><a className="vb-button" href={login}>Kampanyamı oluştur <ArrowRight /></a><small>Tarayıcınızda · Mesajify web uygulaması</small></section>
    </main>
    <footer className="vb-footer vb-wrap"><div className="vb-footer-top"><div><MesajifyMark variant="full" size="md" /><p>İşletmenizi anlatın.<br />Yeni konuşmalar başlatın.</p></div><div><strong>ÜRÜN</strong><a href="#hizmetler">Hizmetler</a><a href="#nasil-calisir">Nasıl çalışır?</a><a href="#paketler">Paketler</a></div><div><strong>KEŞFEDİN</strong><a href="#ozellikler">Ortak Gelen Kutusu</a><a href="#kampanya">Kampanya hazırlama</a><a href="#sorular">Sık sorulan sorular</a></div><div><strong>MESAJIFY</strong><a href={login}>Giriş yap</a><a href={login}>Hemen başla</a><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}{paused ? 'Filmleri oynat' : 'Filmleri duraklat'}</button></div></div><div className="vb-footer-bottom"><span>© {new Date().getFullYear()} Mesajify</span><span>WhatsApp Kampanya Platformu</span><a href="#sayfa-basi">Başa dön ↑</a></div></footer>
  </div>;
}
