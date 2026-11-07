'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCheck, ImagePlus, MessageCircle, MoreHorizontal, Pause, Play, Send, Sparkles, Users } from 'lucide-react';

export const assets = {
  source: '/landing/studio/sources/nike_sneaker_raw.jpg',
  result: '/landing/studio/product-source-raw.jpg',
};

function useCinema(paused: boolean, count: number, duration = 5000) {
  const ref = useRef<HTMLDivElement>(null);
  const [chapter, setChapter] = useState(0);
  const [running, setRunning] = useState(false);
  const [localPause, setLocalPause] = useState(false);
  const [reduced, setReduced] = useState(false);
  const progress = useRef(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener('change', sync);
    const observer = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting), { threshold: .22 });
    observer.observe(node);
    return () => { observer.disconnect(); media.removeEventListener('change', sync); };
  }, []);

  useEffect(() => {
    if (!running || paused || localPause || reduced || count < 2) return;
    let previous = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 80);
      previous = now;
      if (!document.hidden) {
        progress.current += delta;
        ref.current?.style.setProperty('--film-progress', String(Math.min(progress.current / duration, 1)));
        if (progress.current >= duration) {
          progress.current = 0;
          setChapter(value => (value + 1) % count);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, paused, localPause, reduced, count, duration]);

  const select = (index: number) => {
    progress.current = 0;
    ref.current?.style.setProperty('--film-progress', '0');
    setChapter(index);
  };
  return { ref, chapter, select, moving: running && !paused && !localPause && !reduced, localPause, setLocalPause };
}

export function ProductImage({ result = false, className = '', priority = false }: { result?: boolean; className?: string; priority?: boolean }) {
  return <Image className={className} src={result ? assets.result : assets.source} alt={result ? 'Kırmızı spor ayakkabının örnek kampanya görseli' : 'Kampanya için kullanılan kırmızı spor ayakkabı fotoğrafı'} width={result ? 720 : 800} height={result ? 1280 : 533} sizes="(max-width: 700px) 70vw, 420px" priority={priority} />;
}

function AdCard({ className = '', animate = false }: { className?: string; animate?: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const sync = () => {
      if (animate && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => { video.pause(); document.removeEventListener('visibilitychange', sync); };
  }, [animate]);
  return <div className={`pm-ad-card ${className}`}><ProductImage result priority /><video ref={ref} className={ready && animate ? 'is-ready' : ''} src="/landing/studio/ecommerce-flow-veo.mp4" muted playsInline loop preload="none" aria-hidden="true" onPlaying={() => setReady(true)} /><div className="pm-ad-top"><span>YENİ SEZON</span><Sparkles /></div><div className="pm-ad-bottom"><span>Her adımda<br /><b>yeni bir başlangıç.</b></span><span className="pm-ad-mini">KOLEKSİYONU KEŞFEDİN <ArrowRight /></span></div></div>;
}

function Phone({ className = '', reply = false }: { className?: string; reply?: boolean }) {
  return <div className={`pm-device ${className}`}><div className="pm-island" /><div className="pm-device-bar"><b>9:41</b><span>••• ▰</span></div><div className="pm-wa-header"><span className="pm-wa-avatar">S</span><div><b>Studio Store</b><small>İşletme hesabı</small></div><MoreHorizontal /></div><div className="pm-wa-body"><span className="pm-chat-day">Bugün</span><div className="pm-wa-message"><ProductImage result /><p>Yeni sezonla tanışın. ✨<br />Yeni koleksiyonumuz şimdi mağazamızda.</p><small>09:41 <CheckCheck /></small></div><div className={`pm-customer-reply ${reply ? 'is-visible' : ''}`}>Merhaba, 38 numarası var mı?<small>09:42</small></div></div><div className="pm-wa-input"><span>Mesaj</span><span>＋</span></div><div className="pm-device-home" /></div>;
}

const heroChapters = ['İçeriği hazırlayın', 'Kitlenize ulaştırın', 'Yanıtları yönetin'];

export function HeroCinema({ paused }: { paused: boolean }) {
  const { ref, chapter, select, moving } = useCinema(paused, 3, 5500);
  return <div className={`pm-hero-film pm-cinema ${moving ? 'is-playing' : ''}`} ref={ref} data-chapter={chapter}>
    <div className="pm-hero-film-brand"><Image src="/brand/mesajify-symbol.png" alt="" width={32} height={29} /><span>Bir fikirden, yeni bir konuşmaya.</span></div>
    <div className="pm-hero-grain" />
    <div className="pm-hero-scene pm-scene-create" aria-hidden={chapter !== 0}>
      <div className="pm-source-mini"><div><ImagePlus /><span>Ürün fotoğrafınız</span></div><ProductImage priority /><span><Check />Görsel eklendi</span></div>
      <svg className="pm-hero-connector" viewBox="0 0 600 450" fill="none"><path d="M185 300 C300 300 260 155 380 155" /><path className="pm-hero-flow" d="M185 300 C300 300 260 155 380 155" /></svg>
      <AdCard className="pm-hero-ad" /><div className="pm-ai-pill"><Sparkles /><span>Kreatif Stüdyosu</span><Check /></div>
    </div>
    <div className="pm-hero-scene pm-scene-send" aria-hidden={chapter !== 1}>
      <div className="pm-mini-campaign"><span className="pm-scene-overline">KAMPANYANIZ</span><h4>Yeni sezon duyurusu</h4><div><Users /><span>Mağaza müşterileri</span><Check /></div><div><ImagePlus /><span>Görsel + mesaj</span><Check /></div><div className="pm-mini-send"><Send />WhatsApp’tan paylaşın</div></div><Phone className="pm-hero-phone" />
    </div>
    <div className="pm-hero-scene pm-scene-conversation" aria-hidden={chapter !== 2}>
      <Phone className="pm-hero-phone-reply" reply /><div className="pm-floating-reply"><div><span className="pm-person">A</span><span><b>Ayşe</b><small>Yeni bir konuşma</small></span><MessageCircle /></div><p>Merhaba, 38 numarası var mı?</p><footer><span>Satış ekibi</span><span>Yanıtlayın <ArrowRight /></span></footer></div>
    </div>
    <div className="pm-hero-film-controls"><span>{heroChapters[chapter]}</span><div>{heroChapters.map((name, index) => <button key={name} type="button" onClick={() => select(index)} aria-label={name} aria-pressed={chapter === index}><i /></button>)}</div></div>
  </div>;
}

export function CreativeCinema({ paused }: { paused: boolean }) {
  const { ref, chapter, moving, localPause, setLocalPause } = useCinema(paused, 3, 4700);
  const captions = ['Bir ürün fotoğrafıyla başlayın.', 'Ne anlatmak istediğinizi ekleyin.', 'Kampanyanız için yeni bir görünüm.'];
  return <div className={`pm-creative-film pm-cinema ${moving ? 'is-playing' : ''}`} ref={ref} data-chapter={chapter}>
    <div className="pm-film-topline"><span><Sparkles />KREATİF STÜDYOSU</span><span>Görselden kampanyaya</span></div>
    <div className="pm-creative-track"><div className="pm-large-source"><div className="pm-source-top"><ImagePlus /><span>Ürün fotoğrafı</span><MoreHorizontal /></div><ProductImage /><div className="pm-source-file"><span><ImagePlus /><b>yeni-sezon.jpg</b></span><Check /></div></div>
      <div className="pm-creative-bridge"><svg viewBox="0 0 230 100" aria-hidden="true"><path d="M0 50H230" /><path className="pm-travel-line" d="M0 50H230" /></svg><div className="pm-studio-mark"><Image src="/brand/mesajify-symbol.png" alt="Mesajify" width={70} height={63} /></div><span>Kreatif Stüdyosu</span><div className="pm-creative-prompt"><Sparkles /><span>Yeni sezonu duyuralım.</span></div></div>
      <AdCard className="pm-large-ad" animate={moving && chapter === 2} />
    </div>
    <div className="pm-feature-film-bottom"><span>{captions[chapter]}</span><div><span>Temsili ürün anlatımı</span><button type="button" aria-label={localPause ? 'Kreatif filmini oynat' : 'Kreatif filmini duraklat'} onClick={() => setLocalPause(!localPause)}>{localPause ? <Play /> : <Pause />}</button></div></div>
  </div>;
}

const campaignChapters = ['İzinli kitlenizi seçin', 'Mesajınızı önizleyin', 'Gönderiminizi takip edin'];

export function CampaignCinema({ paused }: { paused: boolean }) {
  const { ref, chapter, select, moving } = useCinema(paused, 3, 5500);
  return <div className={`pm-campaign-film pm-cinema ${moving ? 'is-playing' : ''}`} ref={ref} data-chapter={chapter}>
    <div className="pm-campaign-app"><div className="pm-app-top"><span><Image src="/brand/mesajify-symbol.png" alt="" width={25} height={23} />Kampanyalar <span>/</span><b>Yeni sezon</b></span><span className="pm-outline-badge">Örnek kampanya</span></div>
      <div className="pm-campaign-inner"><div className="pm-campaign-heading"><span className="pm-scene-overline">KAMPANYA ÇALIŞMA ALANI</span><h3>Yeni sezonu birlikte duyuralım.</h3><p>İçeriğiniz hazır. Sırada doğru kişilere ulaştırmak var.</p></div>
        <div className="pm-campaign-content"><div className="pm-audience-picker"><div><Users /><b>Mağaza müşterileri</b><span><Check />Seçildi</span></div><div className="pm-audience-person"><span>AK</span><div><b>Ayşe Kaya</b><small>Yeni sezon listesi</small></div><Check /></div><div className="pm-audience-person"><span>MD</span><div><b>Mehmet Demir</b><small>Yeni sezon listesi</small></div><Check /></div><div className="pm-audience-person"><span>SY</span><div><b>Selin Yılmaz</b><small>Yeni sezon listesi</small></div><Check /></div><p><Check />İletişim izni bulunan kişileriniz.</p></div>
          <div className="pm-message-composer"><div><MessageCircle /><b>Kampanya mesajınız</b><MoreHorizontal /></div><div className="pm-composer-body"><ProductImage result /><p>Yeni sezonla tanışın. ✨<br />Yeni koleksiyonumuzu sizinle paylaşmak istedik.</p></div><div className="pm-composer-footer"><span><ImagePlus />Görsel eklendi</span><span>Önizleme hazır <Check /></span></div></div></div>
        <div className="pm-campaign-app-footer"><span><Check />Kitle hazır</span><span><Check />İçerik hazır</span><div><Send />Gönderim önizlemesi</div></div>
      </div>
    </div><div className="pm-campaign-phone"><Phone reply={chapter === 2} /></div>
    <div className="pm-delivery-toast"><span><CheckCheck /></span><div><b>Her adım görünür.</b><small>Gönderimleriniz ve yanıtlarınız aynı yerde.</small></div></div>
    <div className="pm-campaign-chapters" aria-label="Kampanya anlatımı">{campaignChapters.map((label, i) => <button type="button" key={label} onClick={() => select(i)} aria-pressed={chapter === i}><span>0{i + 1}</span>{label}<i /></button>)}</div>
  </div>;
}

export function InboxCinema({ paused }: { paused: boolean }) {
  const { ref, chapter, moving } = useCinema(paused, 3, 4300);
  return <div ref={ref} className={`pm-inbox-film pm-cinema ${moving ? 'is-playing' : ''}`} data-chapter={chapter}>
    <div className="pm-inbox-app"><div className="pm-inbox-sidebar"><span className="pm-scene-overline">ORTAK GELEN KUTUSU</span><h3>Konuşmalar</h3><div className="pm-inbox-filters"><span>Tümü</span><span>Ekibim</span></div>{[{ name: 'Ayşe Kaya', text: 'Merhaba, 38 numarası var mı?', initial: 'A' }, { name: 'Mehmet Demir', text: 'Teşekkürler, inceleyeceğim.', initial: 'M' }, { name: 'Selin Yılmaz', text: 'Mağazanız saat kaçta açılıyor?', initial: 'S' }].map((person, index) => <div className={`pm-conversation-row ${index === 0 ? 'selected' : ''}`} key={person.name}><span className="pm-person">{person.initial}</span><div><b>{person.name}</b><small>{person.text}</small></div>{index === 0 && <i />}</div>)}</div>
    <div className="pm-inbox-thread"><header><span className="pm-person">A</span><div><b>Ayşe Kaya</b><small>Yeni sezon kampanyası</small></div><span className="pm-assignee"><span>E</span>Elif · Satış ekibi<ChevronIcon /></span></header><div className="pm-thread-body"><span className="pm-thread-day">Bugün</span><div className="pm-thread-ad"><ProductImage result /><p>Yeni sezonla tanışın. ✨</p><small>09:41 <CheckCheck /></small></div><div className="pm-thread-question">Merhaba, 38 numarası var mı?<small>09:42</small></div><div className="pm-thread-answer">Merhaba Ayşe Hanım, evet mevcut.<br />Size yardımcı olmaktan mutluluk duyarız.<small>09:43 <CheckCheck /></small></div></div><div className="pm-inbox-input"><span>Ayşe’ye yanıt yazın…</span><Send /></div></div></div>
    <div className="pm-inbox-toast"><span className="pm-person">E</span><div><b>Doğru kişi, doğru konuşma.</b><span>Satış ekibine atandı.</span></div><Check /></div>
  </div>;
}

function ChevronIcon() { return <svg viewBox="0 0 20 20" fill="none"><path d="m5 8 5 5 5-5" stroke="currentColor" strokeWidth="1.5" /></svg>; }

export function SampleVideo({ sector, paused }: { sector: string; paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    let manuallyPaused = false;
    const sync = () => {
      if (visible && !paused && !reduced.matches && !document.hidden && !manuallyPaused) node.play().catch(() => {});
      else node.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .45 });
    const pause = () => { manuallyPaused = true; };
    node.addEventListener('manualpause', pause);
    observer.observe(node);
    reduced.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); node.pause(); node.removeEventListener('manualpause', pause); reduced.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [paused]);
  return <div className="pm-sample-video"><video ref={ref} src={`/landing/studio/${sector}-flow-veo.mp4`} poster={`/landing/cinema/${sector}-poster.webp`} muted playsInline loop preload="none" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label={`${sector} örnek reklam videosu`} /><button type="button" aria-label={playing ? 'Videoyu duraklat' : 'Videoyu oynat'} onClick={() => { const node = ref.current; if (!node) return; if (node.paused) node.play().catch(() => {}); else { node.dispatchEvent(new Event('manualpause')); node.pause(); } }}>{playing ? <Pause /> : <Play />}</button></div>;
}

export function CampaignFilm({ paused }: { paused: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [localPause, setLocalPause] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false;
    const sync = () => {
      if (visible && !paused && !localPause && !media.matches && !document.hidden) video.play().catch(() => {});
      else video.pause();
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .3 });
    observer.observe(video);
    media.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    return () => { observer.disconnect(); video.pause(); media.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync); };
  }, [paused, localPause]);
  return <div className="pm-master-film pm-cinema"><video ref={ref} src="/landing/cinema/campaign-film-v2-web.mp4" poster="/landing/cinema/campaign-film-v2-poster.webp" width={1440} height={1080} preload="none" muted playsInline loop onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} aria-label="Mesajify ürün filmi: fotoğraftan kampanyaya, kampanyadan WhatsApp konuşmasına" /><button className="pm-master-control" type="button" aria-label={playing ? 'Ürün filmini duraklat' : 'Ürün filmini oynat'} onClick={() => { const video = ref.current; if (!video) return; if (video.paused) { setLocalPause(false); video.play().catch(() => {}); } else { setLocalPause(true); video.pause(); } }}>{playing ? <Pause /> : <Play />}</button></div>;
}
