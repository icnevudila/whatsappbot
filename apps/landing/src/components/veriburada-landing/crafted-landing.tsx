'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, ChevronDown, FileSpreadsheet, ImagePlus, Menu, MessageCircle, Pause, Play, Search, Send, X } from 'lucide-react';
import { MesajifyMark } from '../brand/mesajify-mark';
import './crafted-landing.css';
import { CampaignComparison } from './campaign-comparison';

const account = 'https://app.mesajify.com/giris';
const media = '/landing/crafted/';
const styleFiles = ['brick-smart.webp', 'ayvaz-campaign-v2.webp'];
type Scene = 'hero' | 'overview' | 'discovery' | 'creative' | 'campaign' | 'inbox';
const scenes = [
  { name: 'discovery' as Scene, title: 'Doğru işletmelerle başlayın.', text: 'İl, ilçe ve kategori seçin. Aradığınız işletmelerin listesini talep edin.', action: 'İlk listemi talep et', label: 'İl-ilçe ve kategori ile liste talebi; hazırlanan listenin kişi gruplarına eklenmesi. Temsili kayıtlar.' },
  { name: 'creative' as Scene, title: 'Reklamınız markanızı anlatsın.', text: 'Ürününüzü ve amacınızı seçin. Markanıza özel görsel ve videolar hazırlayın.', action: 'Kreatif Stüdyo’yu keşfet', label: 'Gerçek ürün kataloğu, tasarım stili, reklam metinleri ve yeni üretilen kampanya görseliyle Mesajify Creative Studio akışı.' },
  { name: 'campaign' as Scene, title: 'WhatsApp’tan ulaştırın.', text: 'Grubunuzu seçin, mesajınızı hazırlayın. Önizleyin, gönderin ve yanıtları takip edin.', action: 'İlk kampanyamı hazırla', label: 'Gerçek kampanya adımları: alıcı grubu, içerik, mesaj, gönderen ve önizleme. Temsili gönderim ve yanıt.' },
];
const steps = ['Liste talep edin', 'Reklamınızı hazırlayın', 'Kampanyanızı gönderin', 'Yanıtları karşılayın'];

function ProductFilm({ scene, label, paused, hero = false, tour = false }: { scene: Scene; label: string; paused: boolean; hero?: boolean; tour?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const iframe = useRef<HTMLIFrameElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const movie = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [localPaused, setLocalPaused] = useState(false);
  const [chapter, setChapter] = useState(0);
  const [source, setSource] = useState('');
  const [moving, setMoving] = useState(false);
  const manualPlay = useRef(false);
  const loadedSource = useRef('');
  const file = scene;
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const compact = matchMedia('(max-width: 760px)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const send = (action: string) => iframe.current?.contentWindow?.postMessage({ channel: 'mesajify-film', action }, location.origin);
    const load = () => {
      const next = `${media}scene.html?mode=${scene}${compact.matches ? '&mobile' : ''}`;
      if (loadedSource.current !== next) { loadedSource.current = next; setReady(false); setSource(next); }
    };
    const sync = () => {
      const run = visible && !paused && !localPaused && (!reduced.matches || manualPlay.current) && !document.hidden;
      if (visible) load();
      send(run ? 'play' : 'pause');
      setMoving(run);
    };
    const onReady = (event: MessageEvent) => {
      if (event.origin !== location.origin || event.source !== iframe.current?.contentWindow || event.data?.channel !== 'mesajify-film') return;
      if (Number.isInteger(event.data.chapter)) setChapter(event.data.chapter);
      if (event.data.ready) { setReady(true); sync(); }
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .12 });
    observer.observe(root);
    compact.addEventListener('change', load); reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync); addEventListener('message', onReady);
    return () => { observer.disconnect(); compact.removeEventListener('change', load); reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); removeEventListener('message', onReady); send('pause'); };
  }, [scene, paused, localPaused]);
  const select = (index: number) => {
    setChapter(index);
    iframe.current?.contentWindow?.postMessage({ channel: 'mesajify-film', action: 'seek', time: index * 7 + 4.8 }, location.origin);
  };
  return <div className={`cf-film-group ${hero ? 'cf-hero-film' : ''} ${tour ? 'cf-tour-film' : ''}`}>
    <div className={`cf-film ${ready ? 'is-ready' : ''}`} ref={ref} role="group" aria-label={label}>
      <picture className="cf-film-poster"><source media="(max-width:760px)" srcSet={`${media}${file}-mobile-poster.jpg`} /><Image src={`${media}${file}-poster.jpg`} alt={label} width={1400} height={700} unoptimized loading={hero ? 'eager' : 'lazy'} /></picture>
      {source && <iframe ref={iframe} src={source} title={label} tabIndex={-1} aria-hidden="true" onLoad={() => setReady(true)} />}
      <button className="cf-film-control" type="button" disabled={paused} aria-label={moving ? 'Animasyonu duraklat' : 'Animasyonu oynat'} aria-pressed={localPaused} onClick={() => { manualPlay.current = !moving; setLocalPaused(moving); iframe.current?.contentWindow?.postMessage({ channel: 'mesajify-film', action: moving ? 'pause' : 'play' }, location.origin); setMoving(!moving); }}>{moving ? <Pause /> : <Play />}</button>
      {!hero && <button className="cf-movie-open" type="button" aria-label="Ürün filmini büyük aç" onClick={() => { setLocalPaused(true); dialog.current?.showModal(); movie.current?.load(); movie.current?.play().catch(() => {}); }}><Play /><span>Filmi izle</span></button>}
    </div>
    {tour && <div className="cf-chapters" aria-label="Ürün anlatımının bölümleri">{steps.map((step, index) => <button type="button" aria-pressed={chapter === index} key={step} onClick={() => select(index)}><span>0{index + 1}</span>{step}</button>)}</div>}
    {!hero && <dialog className="cf-movie-dialog" ref={dialog} aria-label="Mesajify ürün filmi" onClose={() => movie.current?.pause()} onCancel={() => movie.current?.pause()}><header><span>Mesajify · Ürün filmi</span><button type="button" aria-label="Filmi kapat" onClick={() => dialog.current?.close()}><X /></button></header><video ref={movie} controls playsInline preload="none" poster={`${media}${file}-poster.jpg`} aria-label={label}><source media="(max-width:760px)" src={`${media}${file}-mobile.mp4`} type="video/mp4" /><source src={`${media}${file}.mp4`} type="video/mp4" /></video><p>{label}</p></dialog>}
  </div>;
}

const questions = [
  ['Mesajify ile neler yapabilirim?', 'İşletme listesi talep edebilir, kişi gruplarınızı hazırlayabilir, markanıza ve ürününüze uygun görsel veya video oluşturabilirsiniz. Ardından WhatsApp kampanyanızı hazırlayıp gönderimleri ve gelen yanıtları aynı panelden takip edebilirsiniz.'],
  ['İşletme listesini nasıl talep ederim?', 'Kişiler ekranındaki Liste talep alanında kategorinizi ve il-ilçenizi seçebilirsiniz. Çevremdekiler seçeneğinde adres ve mesafeye göre talep oluşturabilirsiniz. Talebinizin durumunu aynı ekrandan izlersiniz; tamamlandığında liste kişi gruplarınıza eklenir.'],
  ['Kendi ürünlerimi ve logomu kullanabilir miyim?', 'Evet. Marka kitinize logonuzu ve işletme bilgilerinizi, Ürünlerim alanına ürünlerinizi ve fotoğraflarını ekleyebilirsiniz. Kreatif Stüdyo bu bilgileri seçtiğiniz tasarım stili ve reklam amacıyla birlikte kullanır.'],
  ['Görsel ve video için hangi seçenekler var?', 'Görsellerde WhatsApp kare reklam, Instagram hikâyesi ve Instagram gönderisi formatları bulunur. Video tarafında Reels, Hikâye ve Durum için dikey, Türkçe seslendirmeli reklamlar hazırlayabilirsiniz. Kullanım hakları hesabınızdaki pakete bağlıdır.'],
  ['WhatsApp kampanyası nasıl hazırlanır?', 'Kampanya adını belirleyin; alıcı grubunuzu, isteğe bağlı görsel veya videonuzu ve mesajınızı seçin. Mesajı AI ile yazabilir veya iyileştirebilirsiniz. Bağlı hattınızı seçip önizlemeyi kontrol ettikten sonra taslak, planlama veya gönderimle ilerleyebilirsiniz.'],
  ['Gelen mesajlara nasıl yanıt veririm?', 'Mesajlar ekranında gelen ve giden mesajları aynı konuşmada görürsünüz. Yapay zekânın önerdiği üç alternatif yanıtı inceleyip seçebilirsiniz. Otomatik yanıt seçeneği de işletme ayarlarından yönetilir.'],
];

function BrandFlow({ paused }: { paused: boolean }) {
  return <div className={`cf-brand-flow ${paused ? 'is-paused' : ''}`} role="img" aria-label="Ürün fotoğrafı ve marka kiti Mesajify’de birleşir; kampanya görseli ve WhatsApp mesajı olarak hazırlanır.">
    <div className="cf-flow-inputs"><div><ImagePlus /><span><small>Ürünlerim</small><strong>Ürün fotoğrafınız</strong></span><Check /></div><div><MesajifyMark size="xs" /><span><small>Marka kitiniz</small><strong>Logo, renk ve bilgiler</strong></span><Check /></div></div>
    <div className="cf-flow-wire"><svg viewBox="0 0 160 230" preserveAspectRatio="none"><path d="M0 45H45Q80 45 80 80V115H160M0 185H45Q80 185 80 150V115" /></svg><i /><i /></div>
    <div className="cf-flow-core"><MesajifyMark size="lg" /></div><div className="cf-flow-wire cf-flow-wire-right"><svg viewBox="0 0 160 230" preserveAspectRatio="none"><path d="M0 115H160" /></svg><i /></div>
    <div className="cf-flow-output"><header><span>İçeriğiniz hazır.</span><Check /></header><div><Image src={`${media}brick-campaign.webp`} alt="Mesajify stüdyo mantığıyla yeni hazırlanan tuğla reklamı" width={95} height={95} unoptimized /><span><strong>Görsel + mesaj</strong><small>Kampanyanızda kullanın.</small></span></div><footer><Send />WhatsApp’tan ulaştırın.</footer></div>
  </div>;
}

export function CraftedLanding() {
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paused, setPaused] = useState(false);
  const [style, setStyle] = useState(1);
  const styles = [['Marka & Ürün Tanıtımı', 'İşinizi ve ürününüzü anlatan, markanıza özel bir görsel dünya.'], ['Gösterişli Kampanya', 'Ürün ve mesajınızı güçlü bir reklam fikriyle öne çıkarın.']];
  useEffect(() => {
    const scroll = () => setScrolled(scrollY > 80);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    scroll(); addEventListener('scroll', scroll, { passive: true }); addEventListener('keydown', escape);
    return () => { removeEventListener('scroll', scroll); removeEventListener('keydown', escape); };
  }, []);
  return <div className="cf-page" id="sayfa-basi"><a className="cf-skip" href="#main">İçeriğe geç</a>
    <div className="cf-header-dock"><header className={`cf-header ${scrolled ? 'is-scrolled' : ''} ${menu ? 'menu-open' : ''}`}><a href="#sayfa-basi" aria-label="Mesajify ana sayfa"><MesajifyMark variant="full" size="sm" priority /></a><nav id="cf-navigation" aria-label="Ana menü">{[['Hizmetler', '#hizmetler'], ['Nasıl çalışır?', '#nasil-calisir'], ['Kreatif Stüdyo', '#kreatif-studyo'], ['Sorularınız', '#sorular']].map(([text, href]) => <a href={href} key={href}>{text}</a>)}</nav><a className="cf-header-start" href={account}>Hemen başla</a><button type="button" className="cf-menu-toggle" aria-label={menu ? 'Menüyü kapat' : 'Menüyü aç'} aria-expanded={menu} aria-controls="cf-menu" onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</button></header>{menu && <nav className="cf-menu" id="cf-menu" aria-label="Bölümler">{[['İşletme listeleri', '#liste-talebi'], ['Kreatif Stüdyo', '#kreatif-studyo'], ['WhatsApp kampanyaları', '#kampanyalar'], ['Mesajlar ve yanıtlar', '#mesajlar'], ['Sık sorulan sorular', '#sorular']].map(([text, href]) => <a key={href} href={href} onClick={() => setMenu(false)}>{text}<ArrowRight /></a>)}</nav>}</div>
    <main id="main"><section className="cf-hero cf-wrap"><div className="cf-hero-copy"><h1><span>Müşteriler orada.</span><span>Mesajify burada.</span></h1><p>İşletmeleri bulun. Reklamınızı hazırlayın.<br className="cf-desktop" /> WhatsApp’tan ulaştırın, yanıtları tek yerden yönetin.</p><a className="cf-button" href={account}>İlk kampanyamı hazırla</a></div><ProductFilm scene="hero" hero label="Mesajify’nin gerçek akışı: işletme listesi talebi, markalı içerik üretimi, WhatsApp kampanyası ve gelen yanıtlar." paused={paused} /></section>
    <div className="cf-possibilities cf-wrap" aria-label="Tek çalışma alanında"><span><Search />İşletme listeleri</span><span><ImagePlus />Görsel ve video</span><span><Send />WhatsApp kampanyaları</span><span><MessageCircle />Gelen yanıtlar</span></div>
    <section className="cf-facts cf-wrap" aria-label="Ürün kapsamı">{[['81', 'İlde liste talep edin'], ['2', 'Farklı tasarım yaklaşımı'], ['7', 'Adımda kampanya hazırlığı'], ['Tek', 'Panelde tüm konuşmalar']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</section>
    <section className="cf-services cf-wrap" id="hizmetler"><h2 className="cf-sr">Hizmetlerimiz</h2>{scenes.map((item, index) => <article key={item.name} className="cf-service" id={['liste-talebi', 'kreatif-studyo', 'kampanyalar'][index]}><div className="cf-service-heading"><h2>{item.title}</h2><p>{item.text}</p></div><ProductFilm scene={item.name} label={item.label} paused={paused} /><a className="cf-service-link" href={account}>{item.action}<ArrowRight /></a></article>)}</section>
    <section className="cf-how" id="nasil-calisir"><div className="cf-wrap cf-how-layout"><div><h2>Mesajify<br />nasıl çalışır?</h2><p>Listenizden reklamınıza,<br />ilk mesajınızdan gelen yanıta.<br /><span>İşletmenizi aynı yerden tanıtın.</span></p><a className="cf-text-link" href={account}>Uygulamayı keşfet <ArrowRight /></a></div><ProductFilm scene="overview" tour label="Mesajify ürün anlatımı: liste, stüdyo, kampanya ve mesaj ekranları." paused={paused} /></div></section>
    <CampaignComparison />
    <section className="cf-section cf-wrap cf-brand-section"><div className="cf-section-heading"><h2>Markanız, ürününüz ve mesajınız.<br />Aynı içerikte.</h2><p>Logonuz ve ürün bilgileriniz, seçtiğiniz tasarım stiliyle birleşsin.</p></div><BrandFlow paused={paused} /></section>
    <section className="cf-styles cf-section cf-wrap"><div className="cf-style-copy"><h2>Sizin işiniz.<br />Sizin tarzınız.</h2><p>Ürününüzü seçin. Reklam amacınızı belirleyin.<br />İki tasarım yaklaşımından biriyle devam edin.</p><div className="cf-style-list" role="tablist" aria-orientation="vertical" aria-label="Kreatif Stüdyo tasarım stilleri">{styles.map(([name], index) => <button type="button" role="tab" id={`cf-style-${index}`} aria-selected={style === index} aria-controls="cf-style-description" tabIndex={style === index ? 0 : -1} key={name} onClick={() => setStyle(index)} onKeyDown={event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const next = event.key === 'Home' ? 0 : event.key === 'End' ? styles.length - 1 : (style + (event.key === 'ArrowDown' ? 1 : -1) + styles.length) % styles.length; setStyle(next); document.getElementById(`cf-style-${next}`)?.focus(); } }}><span>0{index + 1}</span>{name}<ArrowRight /></button>)}</div><p className="cf-style-description" role="tabpanel" id="cf-style-description" aria-labelledby={`cf-style-${style}`}>{styles[style][1]}</p></div><div className="cf-ad-example"><div className="cf-ad-chrome"><span>{styles[style][0]} · Yeni örnek reklam</span><span>{style === 0 ? '1:1' : '4:5'}</span></div><Image key={style} src={`${media}${styleFiles[style]}`} width={1000} height={1000} alt={`${styles[style][0]}: katalog ürünü ve marka bilgileriyle yeni hazırlanan örnek reklam.`} unoptimized /><div className="cf-ad-caption"><Check /><span>Ürün, marka ve reklam metni bir arada.</span></div></div></section>
    <section className="cf-inbox cf-section" id="mesajlar"><div className="cf-wrap"><div className="cf-section-heading"><h2>Mesajınız bir konuşmaya dönüşsün.</h2><p>Gelen ve giden mesajları birlikte görün.<br />İşletmenize uygun AI yanıt önerileriyle konuşmaya devam edin.</p></div><ProductFilm scene="inbox" label="Gerçek Mesajlar ekranı yapısıyla temsili bir konuşma ve üç AI yanıt önerisi. Özel kişi verileri kullanılmaz." paused={paused} /><a className="cf-service-link" href={account}>Mesajlar ekranını keşfet <ArrowRight /></a></div></section>
    <section className="cf-use cf-section cf-wrap"><div className="cf-section-heading"><h2>Her adımınız birbirine bağlı.</h2><p>Farklı araçlar arasında kaybolmadan, işinize odaklanın.</p></div><div className="cf-use-grid">{[[FileSpreadsheet, 'Listeniz sizde.', 'Excel’den ekleyin, rehberinizden alın veya işletme listesi talep edin.'], [ImagePlus, 'Markanız içerikte.', 'Ürün kataloğunuz ve marka kitiniz, reklamınızın temelini oluştursun.'], [MessageCircle, 'Konuşma panelinizde.', 'Kampanyanızdan gelen soruları görün, önerilen yanıtlarla devam edin.']].map(([Icon, title, text]) => { const Glyph = Icon as typeof FileSpreadsheet; return <div key={title as string}><Glyph /><h3>{title as string}</h3><p>{text as string}</p></div>; })}</div></section>
    <section className="cf-faq cf-section cf-wrap" id="sorular"><div><h2>Sık sorulan sorular</h2><a className="cf-text-link" href={account}>Mesajify’yi inceleyin <ArrowRight /></a></div><div>{questions.map(([question, answer]) => <details key={question}><summary>{question}<ChevronDown /></summary><p>{answer}</p></details>)}</div></section>
    <section className="cf-closing"><div className="cf-closing-lines" aria-hidden="true"><i /><i /><i /></div><h2>Müşteriler orada.<br /><span>Mesajify burada.</span></h2><p>Listenizi hazırlayın. Reklamınızı oluşturun. İlk mesajınızı ulaştırın.</p><a className="cf-button" href={account}>Kampanyamı hazırla <ArrowRight /></a><small>Tarayıcınızda · Mesajify web uygulaması</small></section>
    </main><footer className="cf-footer cf-wrap"><div className="cf-footer-top"><div><MesajifyMark variant="full" size="sm" /><p>İşletmenizi tanıtın.<br />Yeni konuşmalar başlatın.</p></div><div><strong>ÜRÜN</strong><a href="#liste-talebi">İşletme listeleri</a><a href="#kreatif-studyo">Kreatif Stüdyo</a><a href="#kampanyalar">WhatsApp kampanyaları</a></div><div><strong>KEŞFEDİN</strong><a href="#nasil-calisir">Nasıl çalışır?</a><a href="#mesajlar">Mesajlar ve yanıtlar</a><a href="#sorular">Sık sorulan sorular</a></div><div><strong>MESAJIFY</strong><a href={account}>Giriş yap</a><a href="https://app.mesajify.com/kvkk">Gizlilik politikası</a><a href="https://app.mesajify.com/kosullar">Kullanım koşulları</a></div></div><div className="cf-footer-bottom"><span>© {new Date().getFullYear()} Mesajify</span><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}{paused ? 'Animasyonları oynat' : 'Animasyonları duraklat'}</button><a href="#sayfa-basi">Başa dön ↑</a></div></footer>
  </div>;
}
