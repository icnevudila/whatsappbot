'use client'
import { useEffect, useRef, useState, useId, type ReactNode, type CSSProperties } from 'react';
import { GeneratedMediaSlot } from './generated-media-slot';
import { MesajifyMark } from '../brand/mesajify-mark';
import { replyExamples, campaignExamples } from './story-messages';
import { ApprovedScreenshot } from './approved-screen-gallery';
import { InteractiveLineStory } from './interactive-line-story';
import { sectors as sectorConfig } from '@/content/sectors';
import { productScreens, inboxScreen } from '@/content/product-screens';
import { IconUploadFile, IconTargetRegion, IconShieldCheck, IconAudienceGroup, IconSpreadsheet, IconCheckCircle } from './story-icons';

type SignalVariant = 'travel' | 'loading' | 'success' | 'pulse';
const signalPath = 'M9 16h14';
export function MesajifySignal({ variant = 'pulse' }: { variant?: SignalVariant }) {
  return <svg viewBox="0 0 32 32" className={`ml-signal ml-signal-${variant}`} aria-hidden="true"><path className="ml-signal-outline" d={signalPath} pathLength="100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>{variant === 'success' && <path className="ml-signal-check" d="m11 15 4 4 7-8" pathLength="100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}</svg>;
}
// One low-frequency clock per visible scene. CSS handles travel between story beats.
export function useSceneClock(duration = 14, resetKey: string | number = 0, once = false) {
  const ref = useRef<HTMLDivElement>(null);
  const [time, setTime] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = false; let timer: ReturnType<typeof setInterval> | undefined;
    const sync = () => {
      if (timer) clearInterval(timer); timer = undefined;
      setReduced(media.matches);
      const running = visible && !document.hidden && !media.matches && document.documentElement.dataset.labPaused !== 'true' && node.closest('[data-story-paused]')?.getAttribute('data-story-paused') !== 'true';
      node.dataset.running = String(running);
      if (running) timer = setInterval(() => setTime(value => {
        if (once && value + .25 >= duration) { if (timer) clearInterval(timer); timer=undefined; return duration; }
        return value + .25;
      }), 250);
    };
    setTime(0);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .01 });
    observer.observe(node); document.addEventListener('visibilitychange', sync); window.addEventListener('lab-motion-change', sync); media.addEventListener('change', sync);
    return () => { if (timer) clearInterval(timer); observer.disconnect(); document.removeEventListener('visibilitychange', sync); window.removeEventListener('lab-motion-change', sync); media.removeEventListener('change', sync); };
  }, [duration, resetKey, once]);
  return { ref, time: reduced ? duration : once ? time : time % duration, cycle: Math.floor(time / duration), reduced };
}
function MotionStage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current; if (!node) return; let visible = false;
    const update = () => { node.dataset.visible = String(visible && !document.hidden && document.documentElement.dataset.labPaused !== 'true'); };
    const observer = new IntersectionObserver(([e]) => { visible = e.isIntersecting; update(); }, { threshold: .08 });
    observer.observe(node); window.addEventListener('lab-motion-change', update); document.addEventListener('visibilitychange', update);
    return () => { observer.disconnect(); window.removeEventListener('lab-motion-change', update); document.removeEventListener('visibilitychange', update); };
  }, []);
  return <div ref={ref} className={`ml-stage ${className}`} data-visible="false">{children}</div>;
}
function Sample({ children = 'Örnek akış' }: { children?: ReactNode }) { return <small className="ml-sample">{children}</small>; }
function Phone({ children }: { children: ReactNode }) { return <div className="ml-phone"><div className="ml-phone-top"><MesajifyMark size="xs" decorative />Mesajify Tanıtım</div>{children}</div>; }
export function CampaignOrchestrator() {
  const controlId = useId();
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const mobilePathRef = useRef<SVGPathElement>(null);
  const [progress, setProgress] = useState(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const [point, setPoint] = useState({ x:110, y:275, mx:90, my:80 });
  const value = scrub ?? progress;
  const active = Math.min(6, Math.floor(value * 7));
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { if (!ref.current) return; const rect = ref.current.getBoundingClientRect(); setProgress(reduced.matches ? 1 : Math.max(0, Math.min(1, (window.innerHeight * .65 - rect.top) / (rect.height * .7)))); };
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update); reduced.addEventListener('change', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); reduced.removeEventListener('change', update); };
  }, []);
  useEffect(() => { const a=pathRef.current, b=mobilePathRef.current; if (!a || !b) return; const p=a.getPointAtLength(a.getTotalLength()*value), m=b.getPointAtLength(b.getTotalLength()*value); setPoint({x:p.x,y:p.y,mx:m.x,my:m.y}); }, [value]);
  const journey = 'M110 275 C180 275 175 320 310 320 S440 125 575 125 S650 355 770 355 S960 125 1040 180 S1100 485 1020 490 S860 710 700 710';
  return <div ref={ref}><MotionStage className="ml-orchestrator"><Sample>Örnek tanıtım yolculuğu</Sample>
    <div className="ml-journey-canvas" data-step={active}>
      <svg viewBox="0 0 1200 800" preserveAspectRatio="none" className="ml-journey-path ml-desktop-path" aria-hidden="true"><path ref={pathRef} d={journey} fill="none" stroke="currentColor" strokeWidth="1.5"/><path d={journey} fill="none" stroke="#168347" strokeWidth="2" pathLength="100" strokeDasharray="100" strokeDashoffset={100-value*100}/><g transform={`translate(${point.x-14} ${point.y-14})`} className="ml-path-signal"><path d={signalPath} fill="none" stroke="#168347" strokeWidth="3" strokeLinecap="round"/></g></svg>
      <svg viewBox="0 0 360 1300" preserveAspectRatio="none" className="ml-journey-path ml-mobile-path" aria-hidden="true"><path ref={mobilePathRef} d="M180 60 C20 180 330 200 180 350 S40 520 180 625 S320 710 180 780 S30 850 180 890 S330 970 180 1040 S20 1150 180 1220" fill="none" stroke="currentColor" strokeWidth="2"/><g transform={`translate(${point.mx-14} ${point.my-14})`}><path d={signalPath} fill="none" stroke="#168347" strokeWidth="3"/></g></svg>
      <div className={`ml-journey-source ${active===0?'is-active':''}`}><span className="ml-object-label">01 / ÜRÜN</span><img src="/landing/studio/sources/nike_sneaker_raw.jpg" alt="Ürün fotoğrafı" loading="lazy"/></div>
      <div className={`ml-journey-creative ${active>=1?'is-active':''}`}><span className="ml-object-label">02 / KREATİF</span><GeneratedMediaSlot id="real-product-video" alt="Üründen oluşturulan reklam" active={active>=1}/></div>
      <div className={`ml-journey-contacts ${active>=2?'is-active':''}`}><span className="ml-object-label">03 / KİŞİLER</span>{['Ayşe Y.','Mehmet K.','Deniz B.'].map((name,i) => <p key={name}><i>{name[0]}</i>{name}<span>✓</span><small>05•• ••• •• {21+i*17}</small></p>)}</div>
      <div className={`ml-journey-lines ${active>=3?'is-active':''}`}><span className="ml-object-label">04 / HATLAR</span><MesajifyMark size="sm" state="active" decorative /><svg viewBox="0 0 180 55" aria-hidden="true">{[25,90,155].map(x=><path key={x} d={`M90 0 Q90 25 ${x} 50`} fill="none" stroke="currentColor"/>)}</svg><div><span>Hat 01</span><span>Hat 02</span><span>Hat 03</span></div></div>
      <div className={`ml-journey-message ${active>=4?'is-active':''}`}><span className="ml-object-label">05 / MESAJ</span><p>Yeni sezon ürünlerimizi keşfedin. Detaylar ve sipariş için bize yazabilirsiniz.<small>İletildi ✓✓</small></p></div>
      <div className={`ml-journey-reply ${active>=5?'is-active':''}`}><span className="ml-object-label">06 / YANIT</span><p>Fiyat nedir?</p></div>
      <div className={`ml-journey-inbox ${active>=6?'is-active':''}`}><span className="ml-object-label">07 / ORTAK GELEN KUTUSU</span><div><img src="/landing/gelenler.png" alt="Gerçek Inbox ekranı" loading="lazy"/><span className="ml-journey-highlight"/></div></div>
    </div><div className="ml-journey-scrub"><label htmlFor={controlId}>Akışı incele</label><input id={controlId} aria-label="Tanıtım yolculuğu ilerlemesi" type="range" min="0" max="100" value={Math.round(value*100)} onChange={e=>setScrub(Number(e.target.value)/100)}/><button onClick={()=>setScrub(null)}>Kaydırmaya bağla</button></div>
  </MotionStage></div>;
}
export function LineRoutingEngine({ ready = true }: { ready?: boolean }) {
  const {ref,time}=useSceneClock(14,ready?1:0);
  const resting = time>=5 && time<10;
  const phase = time>=5 && time<7 ? 'redirect' : resting ? 'resting' : 'active';
  const paths=['M500 230 C330 230 190 190 130 330','M500 230 C395 290 380 400 350 450','M500 230 C605 290 620 400 650 450','M500 230 C680 220 830 180 870 330'];
  return <div ref={ref} className="ml-stage ml-routing" data-route-phase={phase} data-ready={ready}><Sample>Örnek hat dağıtımı</Sample>
    <div className="ml-routing-topology"><div className="ml-campaign-queue"><span className="ml-object-label">TANITIM KUYRUĞU</span><strong>{ready ? 3 : 0} <small>örnek kişi</small></strong><span className="ml-queue-campaign">Mesajify tanıtımı</span><div className="ml-queue-capsules">{[0,1,2,3,4].map(i=><i key={i} style={{'--delay':`${i*.2}s`} as CSSProperties}/>)}</div></div>
      <svg viewBox="0 0 1000 560" preserveAspectRatio="none" className="ml-topology-paths" aria-hidden="true"><path d="M500 105 V230" stroke="currentColor" fill="none"/>{paths.map((d,i)=><g key={d} className={i===2?'ml-closing-route':''}><path d={d} fill="none" stroke="currentColor" strokeWidth="1.5"/><path className="ml-capsule-packet" d={d} fill="none" stroke="#168347" strokeWidth="7" strokeLinecap="round" pathLength="100" style={{animationDelay:`${i*.55}s`}}/></g>)}<path className="ml-redirect-path" d="M595 335 C630 355 630 355 630 355 S735 235 870 330" fill="none" stroke="#168347" strokeWidth="1.5"/><path className="ml-redirect-packet" d="M595 335 C575 360 505 350 455 345 S350 335 350 450" fill="none" stroke="#168347" strokeWidth="8" strokeLinecap="round" pathLength="100"/><path className="ml-route-gate" d="m603 365 25-15" stroke="#a88b5d" strokeWidth="3"/></svg>
      <svg viewBox="0 0 360 520" preserveAspectRatio="none" className="ml-topology-mobile" aria-hidden="true"><path d="M180 105 V200" stroke="currentColor" fill="none"/>{['M180 200 C180 240 65 250 65 305','M180 200 C180 370 65 370 65 435','M180 200 C180 370 295 370 295 435','M180 200 C180 240 295 250 295 305'].map((d,i)=><g key={d} className={i===2?'ml-closing-route':''}><path d={d} fill="none" stroke="currentColor"/><path className="ml-capsule-packet" d={d} fill="none" stroke="#168347" strokeWidth="5" pathLength="100" style={{animationDelay:i*.55+'s'}}/></g>)}<path className="ml-redirect-packet" d="M240 365 Q180 360 65 435" fill="none" stroke="#168347" strokeWidth="5" pathLength="100"/></svg>
      <div className="ml-routing-core"><MesajifyMark size="lg" state={resting?'processing':'active'} decorative /><span>Routing Engine</span></div>
      {['124','98','112','76'].map((load,i)=><div className={`ml-line-terminal ml-terminal-${i+1} ${i===2&&resting?'is-resting':''}`} key={i}><span className="ml-line-indicator"/><strong>Hat 0{i+1}</strong><small>{i===2&&resting?'DİNLENİYOR':i===3?'HAZIR':'AKTİF'}</small><div className="ml-load-meter"><i style={{transform:`scaleX(${i===2&&resting ? .1 : Number(load)/300})`}}/></div><span className="ml-line-load">{i===2&&resting?'—':`${load} / 300`}</span></div>)}
    </div><div className="ml-routing-caption"><span className={resting?'is-active':''}>Hat 03 {resting?'dinleniyor':'aktif'}</span><span>{resting?'→ Hat 01 · 02 · 04':'Dengeli gönderim'}</span></div>
  </div>;
}
export function ContactValidationDemo({ onReady }: { onReady?: (ready: boolean) => void }) {
  const [run,setRun]=useState(0); const {ref,time}=useSceneClock(8,run,true);
  const scanned=Math.min(4, Math.max(0,Math.floor((time-1)/1.5)));
  useEffect(() => { onReady?.(scanned === 4); }, [scanned, onReady]);
  const rows=[['Ayşe Y.','21','Hazır'],['Mehmet K.','84','Kontrol edildi'],['Selin A.','07','Hariç tutuldu'],['Deniz B.','39','Hazır']];
  return <div ref={ref} className="ml-stage ml-validation" data-scanned={scanned}><Sample>Örnek liste</Sample><div className="ml-validation-flow">
    <div className="ml-file"><svg viewBox="0 0 60 72" aria-hidden="true"><path d="M8 2h30l14 14v54H8zM38 2v16h14" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M18 32h24M18 42h24M18 52h24M26 27v30" stroke="currentColor"/></svg><strong>musteriler.xlsx</strong><small>4 örnek kayıt</small><div className="ml-file-stack"/></div>
    <div className="ml-scanner"><div className="ml-scanner-top"><MesajifyMark size="xs" state={scanned===4?'success':'processing'} decorative /><span>{scanned===4?'Kontrol tamamlandı':'Liste kontrol ediliyor'}</span></div><div className="ml-scan-window" key={run}><div className="ml-scan-line"/>{rows.map(([name,phone,status],i)=><div key={name} className={`ml-scan-row ${scanned>i?'is-scanned':''} ${status==='Hariç tutuldu'?'is-excluded':status==='Kontrol edildi'?'is-check':'is-ready'}`} style={{'--row-index':i} as CSSProperties}><i>{name[0]}</i><span>{name}<small>05•• ••• •• {phone}</small></span><strong>{scanned>i?status:'Bekliyor'}</strong></div>)}</div><div className="ml-scan-progress"><i style={{transform:`scaleX(${scanned/4})`}}/></div></div>
    <div className="ml-clean-list"><span className="ml-object-label">TANITIM LİSTESİ</span>{rows.filter((row,i)=>scanned>i && row[2]!=='Hariç tutuldu').map(([name,,status])=><p key={name} className={status==='Hariç tutuldu'?'is-excluded':''}><span>{status==='Hariç tutuldu'?'—':'✓'}</span>{name}<small>{status}</small></p>)}<div className="ml-clean-summary" aria-live="polite">{scanned===4?<><MesajifySignal variant="success"/><strong>Tanıtıma hazır</strong></>:<small>Kontrol edilenler burada</small>}</div></div>
  </div><button className="ml-replay" onClick={()=>setRun(run+1)}>↻ Tekrar göster</button></div>;
}
const creativeShowcaseItems = [
  {
    id: 'sneaker',
    icon: '👟',
    tabLabel: 'Spor Ayakkabı',
    title: 'Nike Air Flyknit Sneaker',
    brandName: 'Nike Sportswear',
    logo: '/landing/studio/sources/nike_logo.png',
    source: '/landing/studio/sources/nike_sneaker_raw.jpg',
    video: '/landing/studio/ecommerce-flow-veo.mp4',
    sourceLabel: 'Ham Ürün Fotoğrafı + Vektör Logo',
    videoBadge: 'NIKE AIR · 9:16 VEO REKLAM'
  },
  {
    id: 'burger',
    icon: '🍔',
    tabLabel: 'Gurme Burger',
    title: 'Gourmet Smash Cheeseburger',
    brandName: 'Burger Lab Artisan',
    logo: '/landing/studio/sources/burger_logo.png',
    source: '/landing/studio/sources/burger_raw.jpg',
    video: '/landing/studio/restaurant-flow-veo.mp4',
    sourceLabel: 'Menü Çekimi + Restoran Logosu',
    videoBadge: 'BURGER LAB · GURME MENÜ'
  },
  {
    id: 'car',
    icon: '🏎️',
    tabLabel: 'Lüks Otomobil',
    title: 'Porsche Panamera GTS',
    brandName: 'Veloce Motors',
    logo: '/landing/studio/sources/car_logo.png',
    source: '/landing/studio/sources/car_raw.jpg',
    video: '/landing/studio/automotive-flow-veo.mp4',
    sourceLabel: 'Showroom Çekimi + Galeri Arması',
    videoBadge: 'VELOCE · VIP TEST SÜRÜŞÜ'
  },
  {
    id: 'mesajify',
    icon: '⚡',
    tabLabel: 'Mesajify Platform',
    title: 'Mesajify WhatsApp Kampanyası',
    brandName: 'Mesajify',
    logo: '/brand/mesajify-official-logo.png',
    source: '/landing/studio/sources/smartwatch_product.jpg',
    video: '/landing/studio/hero-flow-veo.mp4',
    sourceLabel: 'Stüdyo Çekimi + Resmî Marka Logosu',
    videoBadge: 'MESAJIFY · 9:16 AKILLI REKLAM'
  }
];

export function CreativeTransform({ scrollDriven = false }: { scrollDriven?: boolean }) {
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const { ref, time, cycle } = useSceneClock(10);
  const activeIndex = manualIndex !== null ? manualIndex : cycle % creativeShowcaseItems.length;
  const currentItem = creativeShowcaseItems[activeIndex];
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    if (!scrollDriven) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      setScrollProgress(media.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * 0.78 - rect.top) / (rect.height * 0.85))));
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    media.addEventListener('change', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      media.removeEventListener('change', update);
    };
  }, [scrollDriven, ref]);

  const phase = scrollDriven ? Math.min(4, Math.floor(scrollProgress * 5)) : time < 2 ? 0 : time < 4.5 ? 1 : time < 7 ? 2 : time < 8.5 ? 3 : 4;

  const processSteps = [
    { label: 'Ham Fotoğraf & Logo Alındı', icon: '📸' },
    { label: 'AI Arka Plan Dekupe & Maskeleme', icon: '✨' },
    { label: '3D Sahne & Sinematik Stüdyo Işığı', icon: '🎬' },
    { label: 'Marka Kiti & Vektör Logo Giydirme', icon: '🏷️' },
    { label: '9:16 WhatsApp Reklam Videosu Hazır', icon: '🚀' }
  ];

  return (
    <div ref={ref} className="ml-stage ml-transform" data-phase={phase} data-scroll-driven={scrollDriven}>
      <Sample>Görsel dönüşüm örneği</Sample>

      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', marginBottom: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {creativeShowcaseItems.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setManualIndex(idx)}
            style={{
              padding: '6px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '20px',
              border: activeIndex === idx ? '1px solid #00a884' : '1px solid #dce5df',
              background: activeIndex === idx ? '#e5f4ec' : '#fff',
              color: activeIndex === idx ? '#168347' : '#5a6e60',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{item.icon}</span>
            <span>{item.tabLabel}</span>
          </button>
        ))}
      </div>

      <div className="ml-product-event ml-creative-event" key={`${activeIndex}-${phase}`}>
        <MesajifyMark size="sm" decorative />
        <div>
          <small>{currentItem.title.toUpperCase()}</small>
          <strong>
            {
              [
                'Ham ürün fotoğrafı ve marka logosu alındı',
                'Yapay zeka ile arka plan dekupe ediliyor',
                '3D sinematik stüdyo sahnesi ve ışıklar işleniyor',
                'Kurumsal marka kiti ve logo entegre ediliyor',
                'Dikey WhatsApp reklam videosu yayına hazır'
              ][phase]
            }
          </strong>
        </div>
        <span>{phase === 4 ? '✓' : '↗'}</span>
      </div>

      <div className="ml-transform-source">
        <span className="ml-object-label">01 / HAM ÜRÜN & LOGO</span>
        <div style={{ position: 'relative', width: '100%', height: '270px', borderRadius: '10px', overflow: 'hidden', background: '#f0f3f1' }}>
          <img
            key={currentItem.source}
            src={currentItem.source}
            alt={currentItem.title}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px', padding: '10px 12px', background: '#f8faf8', border: '1px solid #dce5df', borderRadius: '8px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#fff', border: '1px solid #c9d8ce', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3px', flexShrink: 0 }}>
            <img src={currentItem.logo} alt={currentItem.brandName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: '12px', color: '#163825', fontWeight: 600 }}>{currentItem.brandName}</strong>
            <small style={{ display: 'block', fontSize: '10px', color: '#567261', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentItem.title}</small>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 700, padding: '2px 6px', background: '#e5f4ec', color: '#168347', borderRadius: '4px', letterSpacing: '0.04em' }}>LOGO</span>
        </div>
        <span className="ml-source-note">{currentItem.sourceLabel}</span>
      </div>

      <div className="ml-transform-process">
        <div className="ml-engine-heading">
          <MesajifyMark size="lg" state={phase === 4 ? 'success' : 'processing'} decorative />
          <span>Creative Studio Engine</span>
        </div>
        <div className="ml-processing-stage" style={{ position: 'relative' }}>
          <div className="ml-cinematic-backdrop" />
          <img
            className="ml-product-cutout"
            key={currentItem.source + '-cutout'}
            src={currentItem.source}
            alt={currentItem.title}
            loading="lazy"
          />
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            zIndex: 4,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(6px)',
            padding: '4px 8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <img src={currentItem.logo} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
            <span style={{ fontSize: '10px', fontWeight: 600, color: '#163825' }}>Marka Kiti Eşlendi</span>
          </div>
          <div className="ml-crop-guide"><i /><i /><i /><i /></div>
          <div className="ml-processing-sweep" />
        </div>
        <div className="ml-processing-labels">
          {processSteps.map((step, i) => (
            <span key={step.label} className={phase >= i ? 'is-active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>{step.icon}</span>
              <span>{step.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="ml-transform-output">
        <span className="ml-object-label">02 / WHATSAPP’A HAZIR VİDEO</span>
        <div className="ml-output-frame">
          <div className="ml-media" style={{ aspectRatio: '9/16', position: 'relative', overflow: 'hidden', borderRadius: '10px' }}>
            <video
              key={currentItem.video}
              src={currentItem.video}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Tamamlanmış ürün reklamı"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              top: '12px',
              left: '12px',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '5px 10px',
              background: 'rgba(12, 22, 16, 0.78)',
              backdropFilter: 'blur(8px)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.18)'
            }}>
              <img src={currentItem.logo} alt="" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '3px' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', letterSpacing: '0.02em' }}>{currentItem.videoBadge}</span>
            </div>
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '12px',
              right: '12px',
              zIndex: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 10px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(6px)',
              borderRadius: '6px',
              fontSize: '10px',
              color: '#e5f4ec'
            }}>
              <span>WhatsApp Dikey Reklam</span>
              <strong style={{ color: '#00a884' }}>9:16 · 8 SN VEO</strong>
            </div>
          </div>
        </div>
        <span className="ml-output-status">{phase === 4 ? 'Kreatif hazır ✓ · Doğrudan WhatsApp ile gönderilebilir' : 'Kreatif hazırlanıyor…'}</span>
      </div>
    </div>
  );
}
const inboxCampaignDemos = [
  {
    video: '/landing/studio/ecommerce-flow-veo.mp4',
    message: 'Yeni koleksiyonumuz yayında! Seçili ürünlerde özel lansman fırsatını keşfedin.',
    reply: 'Farklı renk ve numaraları mevcut mu?',
    label: 'E-Ticaret Kampanyası'
  },
  {
    video: '/landing/studio/restaurant-flow-veo.mp4',
    message: 'Özel gurme menümüz ve akşam lezzetlerimiz hazır. Rezervasyon için yazabilirsiniz.',
    reply: 'Bu akşam için iki kişilik yeriniz var mı?',
    label: 'Restoran Kampanyası'
  },
  {
    video: '/landing/studio/automotive-flow-veo.mp4',
    message: 'Yeni sezon otomobil modellerimizi ve avantajlı test sürüşü fırsatlarını keşfedin.',
    reply: 'Hafta sonu test sürüşü için randevu alabilir miyim?',
    label: 'Otomotiv Tanıtımı'
  },
  {
    video: '/landing/studio/realestate-flow-veo.mp4',
    message: 'Seçkin villa ve rezidans projelerimiz yayında. Detaylı katalog için bize ulaşın.',
    reply: 'Kat planlarını ve fiyat listesini paylaşır mısınız?',
    label: 'Emlak Portföyü'
  }
];

export function ReplyToInbox() {
  const { ref, time, cycle } = useSceneClock(7);
  const currentDemo = inboxCampaignDemos[cycle % inboxCampaignDemos.length];
  const { message, reply, video: currentVideo } = currentDemo;
  const connectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = connectionRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => node.style.setProperty('--reply-gap', `${node.clientWidth}px`));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const phase = time < 0.6 ? 0 : time < 1.2 ? 1 : time < 2.0 ? 2 : time < 2.8 ? 3 : time < 4.0 ? 4 : 5;

  return (
    <div ref={ref} className="ml-stage ml-reply" data-phase={phase}>
      <Sample>Örnek konuşma · Gelen Kutusu işleyişi</Sample>
      <div className="ml-product-event ml-reply-event" key={`${cycle}-${phase}`}>
        <MesajifyMark size="sm" decorative />
        <div>
          <small>{currentDemo.label.toUpperCase()}</small>
          <strong>
            {
              [
                'Tanıtım mesajı hazırlanıyor',
                'Mesaj iletildi',
                'Müşteri yazıyor',
                'Yeni yanıt geldi',
                'Yanıt Inbox’a taşınıyor',
                'Konuşma tek panelde'
              ][phase]
            }
          </strong>
        </div>
        <span>{phase === 5 ? '✓' : '↗'}</span>
      </div>

      <div className="ml-reply-phone">
        <Phone>
          <div className="ml-media" style={{ aspectRatio: '9/16' }}>
            <video
              key={currentVideo}
              src={currentVideo}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Kampanya tanıtım videosu"
            />
          </div>
          <p className="ml-message ml-delivered">
            {message}
            <small>{phase >= 1 ? 'İletildi ✓✓' : 'Gönderiliyor'}</small>
          </p>
          <div className="ml-typing" aria-label="Müşteri yazıyor">
            <i /><i /><i />
          </div>
          <p className="ml-customer ml-phone-reply">{reply}</p>
        </Phone>
        <span className="ml-object-label">MÜŞTERİ KONUŞMASI</span>
      </div>

      <div ref={connectionRef} className="ml-reply-connection">
        <svg viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 145 C65 145 100 35 200 35" fill="none" stroke="currentColor" strokeWidth="1" />
          <path
            className="ml-reply-trail"
            d="M0 145 C65 145 100 35 200 35"
            pathLength="100"
            fill="none"
            stroke="#168347"
            strokeWidth="2"
          />
        </svg>
        <span className="ml-travel-reply">{reply}</span>
      </div>

      <div className="ml-real-inbox">
        <div className="ml-inbox-line-sources">
          <span>Hat 01</span>
          <span>Hat 02</span>
          <span>Hat 03</span>
          <strong>→ MESAJIFY GELEN KUTUSU</strong>
        </div>
        <div className="ml-browser-bar">
          <span>● ● ●</span>Mesajify / Gelenler<span className="ml-inbox-notice">Yeni yanıt</span>
        </div>
        <div className="ml-inbox-screen ml-inbox-illustration">
          <aside>
            <div className="ml-inbox-example-title">
              <MesajifyMark size="sm" decorative />
              <strong>Gelen Kutusu</strong>
            </div>
            <span className="ml-inbox-filter">Tüm konuşmalar <small>3</small></span>
            {['Örnek müşteri', 'Tanıtım yanıtı', 'Ürün sorusu'].map((label, i) => (
              <div key={label} className="ml-inbox-example-row" data-selected={i === 0 && phase >= 4}>
                <span>{['A', 'B', 'C'][i]}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{i === 0 && phase >= 4 ? reply : 'Konuşmayı görüntüle'}</small>
                </div>
                <i />
              </div>
            ))}
          </aside>
          <div className="ml-inbox-example-chat">
            <header>
              <span>
                Örnek müşteri<small>WhatsApp · Hat 02</small>
              </span>
              <b>Atanmamış</b>
            </header>
            <div className="ml-inbox-example-messages">
              <p className="ml-inbox-outgoing">
                {message}
                <small>Tanıtım mesajı · ✓✓</small>
              </p>
              <p key={`${cycle}-${phase}`} className="ml-inbox-incoming" data-arrived={phase >= 4}>
                {reply}
                <small>Şimdi · Hat 02</small>
              </p>
              <span className="ml-inbox-example-notice" data-arrived={phase >= 4}>
                ✓ Yanıt konuşmaya eklendi
              </span>
            </div>
            <footer>Yanıtınızı yazın… <span>↗</span></footer>
          </div>
        </div>
      </div>
    </div>
  );
}
const sectors = sectorConfig.map(item=>({...item,message:item.campaignMessage,reply:item.customerReply}));
export function SectorCampaignLab() {
  const [active,setActive] = useState(0), [displayed,setDisplayed]=useState(0), [changing,setChanging]=useState(false);
  const prefix=useId(); const sector=sectors[displayed]; const {ref,time,cycle}=useSceneClock(5,displayed);
  useEffect(()=>{ if(active===displayed)return; setChanging(true); const timer=setTimeout(()=>{setDisplayed(active);setChanging(false);},220);return()=>clearTimeout(timer); },[active,displayed]);
  return <div ref={ref} className="ml-stage ml-sector" data-changing={changing} style={{'--sector-accent':sector.accent} as CSSProperties} data-chat-phase={time>=1.5?'reply':'typing'} data-chat-beat={time<.6?'sent':time<1.5?'typing':'reply'}>
    <div className="ml-sector-nav" role="tablist" aria-label="Sektörler">{sectors.map((item,i)=><button key={item.id} role="tab" id={`${prefix}-sector-${i}`} aria-controls={`${prefix}-sector-preview`} aria-selected={i===active} tabIndex={i===active?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>{if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?sectors.length-1:(active+(['ArrowDown','ArrowRight'].includes(e.key)?1:sectors.length-1))%sectors.length;setActive(next);document.getElementById(`${prefix}-sector-${next}`)?.focus();}}}>{item.label}<span>↗</span></button>)}</div>
    <div id={`${prefix}-sector-preview`} role="tabpanel" aria-labelledby={`${prefix}-sector-${displayed}`} className="ml-sector-preview"><Phone><GeneratedMediaSlot key={sector.id} id={sector.mediaId} alt={`${sector.label} reklam örneği`} active={!changing}/></Phone></div>
    <div className="ml-conversation" key={`chat-${sector.id}-${cycle}`}><Sample>Örnek konuşma · AI reklam medyası</Sample><h3>Bir işletme.<br/>Yeni bir konuşma.</h3><span className="ml-object-label">MESAJIFY TANITIMI</span><p className="ml-message">{cycle%2===0?sector.message:"Detaylar ve seçenekler için bize yazabilirsiniz."}<small>{time>=1.5?'İletildi ✓✓':'Gönderiliyor'}</small></p><div className="ml-typing" aria-label="Müşteri yazıyor"><i/><i/><i/></div><span className="ml-object-label ml-customer-label">MÜŞTERİ</span><p className="ml-customer">{cycle%3===0?sector.reply:cycle%3===1?"Detayları paylaşır mısınız?":"Nasıl sipariş verebilirim?"}</p><span className="ml-new-reply">Yeni yanıt Mesajify Gelen Kutusu’na düştü.</span></div>
  </div>;
}
const screens = productScreens.map(item=>[item.label,item.id,item.description]);
export function ProductScreenExplorer({ initialInbox = false }: { initialInbox?: boolean }) {
  const [active,setActive]=useState(initialInbox?productScreens.findIndex(item=>item.id==='gelenler'):0),[displayed,setDisplayed]=useState(initialInbox?productScreens.findIndex(item=>item.id==='gelenler'):0),[changing,setChanging]=useState(false),[annotated,setAnnotated]=useState(false),[focus,setFocus]=useState<number|null>(null);const prefix=useId();
  useEffect(()=>{setAnnotated(false);setFocus(null);setChanging(active!==displayed);const swap=setTimeout(()=>{setDisplayed(active);setChanging(false);},250);const annotate=setTimeout(()=>setAnnotated(true),600);return()=>{clearTimeout(swap);clearTimeout(annotate);};},[active]);
  const screen=displayed<0?inboxScreen:productScreens[displayed];const region=focus===null?null:screen.annotations[focus];
  return <div className="ml-stage ml-explorer" data-changing={changing} data-annotated={annotated} data-focused={focus!==null}><div className="ml-tabs" role="tablist" aria-label="Ürün ekranları">{productScreens.map((item,i)=><button id={prefix+'-screen-'+i} key={item.id} role="tab" aria-selected={active===i} aria-controls={prefix+'-panel'} tabIndex={active===i||(active<0&&i===0)?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?productScreens.length-1:(Math.max(0,active)+(e.key==='ArrowRight'?1:productScreens.length-1))%productScreens.length;setActive(next);document.getElementById(prefix+'-screen-'+next)?.focus();}}}>{item.label}</button>)}</div>
  <div className="ml-explorer-browser"><div className="ml-browser-bar"><span>● ● ●</span>Mesajify / {screen.label}</div><div id={prefix+'-panel'} role="tabpanel" aria-label={screen.label} className="ml-explorer-content"><img src={screen.image} alt={'Gerçek Mesajify '+screen.label+' ekranı'} loading="lazy" style={{transform:region?'scale(1.04)':'scale(1)',transformOrigin:region?(region.x+region.width/2)+'% '+(region.y+region.height/2)+'%':'center'}}/>{region&&<span className="ml-explorer-focus" style={{left:region.x+'%',top:region.y+'%',width:region.width+'%',height:region.height+'%'}}/>}{screen.annotations.map((item,i)=><button className="ml-explorer-pin" disabled={!annotated} key={item.label} aria-label={item.label} aria-pressed={focus===i} onClick={()=>setFocus(focus===i?null:i)} style={{left:(item.x+item.width/2)+'%',top:(item.y+item.height/2)+'%',transitionDelay:i*90+'ms'}}>{i+1}</button>)}</div></div><div className="ml-explorer-description"><strong>{screen.label}</strong><p>{screen.description}</p></div></div>;
}
export function CampaignBuilderDemo() {
  const [step,setStep] = useState(0); const [ready,setReady] = useState(false);
  const [preparing,setPreparing]=useState(false);const [lines,setLines]=useState([true,true,true]);
  useEffect(()=>{if(!preparing)return;const timer=setTimeout(()=>{setPreparing(false);setReady(true);},700);return()=>clearTimeout(timer);},[preparing]);
  return <MotionStage className="ml-builder"><Sample>Etkileşimli örnek · gerçek gönderim yapmaz</Sample><div className="ml-tabs">{['Kreatif','Kişiler','Hatlar','Gönder'].map((label,i) => <button key={label} aria-pressed={i===step} onClick={() => { setStep(i); setReady(false);setPreparing(false); }}>{i+1} · {label}</button>)}</div><h3>{['Video seçildi','Örnek kişi listesi','Bağlı hatlar','Tanıtım özeti'][step]}</h3>
    {step===0&&<div className="ml-builder-form"><label>Tanıtım adı<input value="Yeni Koleksiyon" readOnly/></label><div className="ml-builder-video"><GeneratedMediaSlot id="real-product-video" alt="Seçilen kreatif"/></div></div>}
    {step===1&&<label className="ml-builder-field">Kişi listesi<select aria-label="Örnek kişi listesi"><option>Örnek müşteriler · 2.291 kişi</option></select></label>}
    {step===2&&<div className="ml-builder-lines">{lines.map((checked,i)=><label key={i}><input type="checkbox" checked={checked} onChange={e=>{setLines(lines.map((item,index)=>index===i?e.target.checked:item));setReady(false);}}/>Hat 0{i+1}<small>Bağlı · örnek</small></label>)}</div>}
    {step===3&&<div className="ml-builder-summary"><p>Kreatif <span>Video ✓</span></p><p>Kişiler <span>2.291 · örnek</span></p><p>Hatlar <span>{lines.filter(Boolean).length} hat seçildi</span></p></div>}
    <button disabled={preparing||(step===3&&!lines.some(Boolean))} onClick={() => step<3 ? setStep(step+1) : setPreparing(true)}>{preparing?'Tanıtım hazırlanıyor…':ready?'Tanıtım hazır ✓':step===3?'Örnek tanıtımı hazırla':'Devam →'}</button><span className="ml-builder-feedback" aria-live="polite">{ready?'Örnek tanıtım hazır; gönderim yapılmadı.':''}</span>
  </MotionStage>;
}
export function CampaignStatusTicker() {const {ref,time}=useSceneClock(12);const states=['Kreatif hazır','Liste doğrulandı','Hatlar hazır','Tanıtım başladı','Yeni yanıt geldi'];const beat=Math.min(4,Math.floor(time/2));return <div ref={ref} className="ml-stage ml-ticker"><Sample>Örnek durumlar · demo</Sample><div className="ml-ticker-list">{states.slice(Math.max(0,beat-2),beat+1).map((label,i)=><div key={label}><span>✓</span>{label}<small>DEMO · 0{Math.max(0,beat-2)+i+1}</small></div>)}</div></div>;}
export function InboxHotspotExplorer() {
  const [active,setActive]=useState(0);const regions=[{label:'Tüm konuşmalar',x:15.5,y:14,w:32,h:78,description:'Konuşmaları tek listede görün.'},{label:'Müşteri bilgisi',x:51,y:15,w:35,h:8,description:'Seçili konuşmanın kişi bilgisini görün.'},{label:'Canlı yanıt',x:51,y:77,w:43,h:10,description:'Yanıtınızı konuşma alanından gönderin.'},{label:'Yanıt geçmişi',x:50,y:27,w:44,h:38,description:'Gönderilen mesaj ve müşteri yanıtını birlikte görün.'}];const region=regions[active];
  return <MotionStage className="ml-hotspots"><div className="ml-hotspot-frame"><img className="ml-hotspot-image" src="/landing/gelenler.png" alt="Gerçek Mesajify Gelen Kutusu" loading="lazy" style={{transform:'scale(1.04)',transformOrigin:`${region.x+region.w/2}% ${region.y+region.h/2}%`}}/><span className="ml-hotspot-shade" style={{left:`${region.x}%`,top:`${region.y}%`,width:`${region.w}%`,height:`${region.h}%`}}/>{regions.map((item,i)=><button className="ml-hotspot-pin" key={item.label} aria-label={item.label} aria-pressed={active===i} onClick={()=>setActive(i)} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} style={{left:`${item.x+item.w/2}%`,top:`${item.y+item.h/2}%`}}>{i+1}</button>)}</div><div className="ml-tabs" aria-label="Inbox bölgeleri">{regions.map((item,i)=><button key={item.label} aria-pressed={active===i} onClick={()=>setActive(i)}>{i+1} · {item.label}</button>)}</div><div className="ml-hotspot-caption"><strong>{region.label}</strong><p>{region.description}</p></div></MotionStage>;
}
export function DeliveryPulse() {
  const stable=(n:number)=>Math.round(n*100)/100;
  const lines=Array.from({length:4},(_,i)=>({x:stable(300+Math.cos(i*Math.PI/2-Math.PI/4)*110),y:stable(230+Math.sin(i*Math.PI/2-Math.PI/4)*85)}));
  return <MotionStage className="ml-pulse"><Sample>Örnek akış · tanıtım ve yanıt</Sample><svg viewBox="0 0 600 460" aria-hidden="true"><ellipse cx="300" cy="230" rx="110" ry="85" fill="none" stroke="currentColor"/><ellipse cx="300" cy="230" rx="245" ry="180" fill="none" stroke="currentColor" strokeDasharray="2 8"/>{lines.map((line,i)=><g key={i}><path d={`M300 230 L${line.x} ${line.y}`} stroke="currentColor"/><circle cx={line.x} cy={line.y} r="10" fill="var(--ml-core-bg)" stroke="currentColor"/><text x={line.x} y={line.y+26} textAnchor="middle" fill="var(--ml-muted)" fontSize="8">Hat 0{i+1}</text></g>)}{Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,x=stable(300+Math.cos(a)*245),y=stable(230+Math.sin(a)*180),line=lines[Math.floor(i/3)],d=`M300 230 L${line.x} ${line.y} Q${x} ${line.y} ${x} ${y}`;return <g key={i}><path d={`M${line.x} ${line.y} Q${x} ${line.y} ${x} ${y}`} fill="none" stroke="currentColor"/><path d={d} stroke="#91ad9a" fill="none" pathLength="100" className={`ml-packet ${i%4===0?'ml-inbound':''}`} style={{animationDelay:`${i*.3}s`}}/><circle cx={x} cy={y} r="6" fill="var(--ml-core-bg)" stroke="currentColor"/></g>;})}</svg><div className="ml-pulse-core"><MesajifyMark size="md" decorative /><strong>Mesajify</strong></div><span className="ml-pulse-reply">Fiyat?</span><span className="ml-pulse-reply">Bilgi alabilir miyim?</span><span className="ml-pulse-reply">Mevcut mu?</span></MotionStage>;
}
export function FinalJourney() {
 const {ref,time,cycle}=useSceneClock(8);const beat=Math.min(3,Math.floor(time/2));
 return <div ref={ref} className="ml-stage ml-final-story" data-beat={beat}>
 <div className="ml-final-story-grid">
 <article data-active={beat===0}><small>01 · KİTLE</small><h3>Kitlenizi hazırlayın.</h3><div className="ml-final-chat ml-final-audience"><strong>Tanıtım kitlesi</strong>{[1,2,3].map(i=><div key={i}><span>Örnek kişi {i}</span><small>✓ Hazır</small></div>)}<p>Liste yükle veya liste talep et.</p></div><p>Liste kontrolü → tanıtım hazırlığı.</p></article>
 <article data-active={beat===1}><small>02 · TANITIM</small><h3>Mesajınızı hazırlayın.</h3><div className="ml-final-chat ml-final-campaign"><MesajifyMark size="md" decorative/><strong>WhatsApp mesaj tanıtımı</strong><p className="ml-final-outgoing">{campaignExamples[cycle%campaignExamples.length]}<small>Ürün tanıtım mesajı · örnek</small></p><div><span>Seçili kitle</span><small>✓ Hazır</small></div></div><p>Ürün tanıtımı → hedef kitleniz.</p></article>
 <article data-active={beat===2||beat===3}><small>03 · KONUŞMA</small><h3>Yanıtı tek yerde görün.</h3><div className="ml-final-chat"><div className="ml-final-chat-header"><MesajifyMark size="md" decorative/><span>Ortak Gelen Kutusu<small>Hat 01 · örnek konuşma</small></span></div><p className="ml-final-outgoing">{campaignExamples[(cycle+1)%campaignExamples.length]}<small>İletildi ✓✓</small></p><p key={cycle+"-"+beat} className="ml-final-incoming">{replyExamples[(cycle+beat)%replyExamples.length]}<small>Müşteri yanıtı</small></p><div className="ml-final-chat-result">✓ Konuşma ortak Gelen Kutusu’nda</div></div><p>Tanıtımınıza gelen müşteri yanıtları.</p></article>
 </div><Sample>Mesajify tanıtımı · örnek işleyiş · gerçek gönderim yapılmaz</Sample></div>;
}
export function AudiencePipeline(){
  const [mode,setMode]=useState<'upload'|'request'>('upload');
  const {ref,time,cycle}=useSceneClock(6,mode);
  const phase=time<.75?0:time<1.5?1:time<3.8?2:3;
  const scanned=Math.min(4,Math.max(0,Math.floor((time-1.5)/.55)));
  const labels=mode==='upload'?['Liste alındı','Kayıtlar kontrol ediliyor','Kitle hazırlanıyor','Tanıtıma hazır']:['Sektör ve bölge','Talep değerlendiriliyor','Liste hazırlığı','Hazırlık tamamlandı'];

  return <div ref={ref} className="ml-audience-pipeline" data-phase={phase}>
    <div className="ml-pipeline-methods" role="group" aria-label="Kitle akışı">
      <button aria-pressed={mode==='upload'} onClick={()=>setMode('upload')}>
        <div className="ml-method-btn-inner">
          <IconSpreadsheet className="ml-method-btn-icon" />
          <div>
            <strong>Liste yükle</strong>
            <small>Excel / CSV</small>
          </div>
        </div>
      </button>
      <button aria-pressed={mode==='request'} onClick={()=>setMode('request')}>
        <div className="ml-method-btn-inner">
          <IconTargetRegion className="ml-method-btn-icon" />
          <div>
            <strong>Liste talep et</strong>
            <small>Sektör / bölge</small>
          </div>
        </div>
      </button>
    </div>

    <div className="ml-pipeline-map">
      <div className="ml-pipeline-connector">
        <div className="ml-pipeline-line-base" />
        <div className="ml-pipeline-line-progress" style={{ width: phase === 0 ? '0%' : phase === 1 ? '50%' : '100%' }} />
      </div>
      <div className="ml-pipeline-steps">
        <div className="ml-pipeline-step" data-active={phase >= 0} data-current={phase === 0}>
          <div className="ml-pipeline-icon-circle">
            {mode === 'upload' ? <IconUploadFile className="w-5 h-5" /> : <IconTargetRegion className="w-5 h-5" />}
          </div>
          <div className="ml-pipeline-label">
            <strong>{mode === 'upload' ? 'musteriler.xlsx' : 'Sektör / bölge'}</strong>
            <small>{mode === 'upload' ? 'Excel / CSV' : 'Hedefleme'}</small>
          </div>
        </div>

        <div className="ml-pipeline-step" data-active={phase >= 1} data-current={phase === 1}>
          <div className="ml-pipeline-icon-circle">
            <IconShieldCheck className="w-5 h-5" />
          </div>
          <div className="ml-pipeline-label">
            <strong>{mode === 'upload' ? 'Liste kontrolü' : 'Değerlendirme'}</strong>
            <small>{phase >= 1 ? 'Doğrulandı' : 'Kontrol ediliyor'}</small>
          </div>
        </div>

        <div className="ml-pipeline-step" data-active={phase >= 2} data-current={phase >= 2}>
          <div className="ml-pipeline-icon-circle">
            <IconAudienceGroup className="w-5 h-5" />
          </div>
          <div className="ml-pipeline-label">
            <strong>Tanıtım kitlesi</strong>
            <small>{phase >= 3 ? 'Kitleye hazır' : 'Hazırlanıyor'}</small>
          </div>
        </div>
      </div>
    </div>

    <div className="ml-pipeline-records" key={mode+'-'+cycle}>
      {[0,1,2,3].map(i=><div key={i} data-checked={scanned>i}>
        <span className="ml-pipeline-avatar">{String(i+1).padStart(2,'0')}</span>
        <span>Örnek kayıt {i+1}<small>{mode==='upload'?'Kendi listeniz':'Örnek talep akışı'}</small></span>
        <b data-excluded={i===2&&scanned>i}>{scanned>i?(i===2?'Hariç tutuldu':'Hazır ✓'):'Kontrol bekliyor'}</b>
      </div>)}
    </div>

    <div className="ml-pipeline-result" key={phase+'-'+cycle}>
      <span className="ml-pipeline-result-icon">
        {phase === 3 ? <IconCheckCircle className="w-5 h-5 text-[#168347]" /> : <span className="ml-result-pulse-dot" />}
      </span>
      <div>
        <strong>{labels[phase]}</strong>
        <small>{phase===3?'3 örnek kayıt tanıtım listesinde':mode==='request'?'Örnek senaryo · teslim ve kapsam değerlendirmede netleşir':'Hariç tutulan kayıt tanıtıma dahil edilmez'}</small>
      </div>
    </div>
    <p className="ml-pipeline-note">Örnek işleyiş · gerçek liste veya talep gönderilmez.</p>
  </div>;
}
export function BentoCreativeTransform() {
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  const { ref, cycle } = useSceneClock(8);
  const activeIndex = manualIndex !== null ? manualIndex : cycle % creativeShowcaseItems.length;
  const currentItem = creativeShowcaseItems[activeIndex];

  return (
    <div ref={ref} className="ml-bento-creative-studio">
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '2px' }}>
        {creativeShowcaseItems.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setManualIndex(idx)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '16px',
              border: activeIndex === idx ? '1px solid #00a884' : '1px solid #dce5df',
              background: activeIndex === idx ? '#e5f4ec' : '#fff',
              color: activeIndex === idx ? '#168347' : '#5a6e60',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>{item.icon}</span>
            <span>{item.tabLabel}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) auto minmax(0, 1fr)', gap: '12px', alignItems: 'center' }}>
        <div style={{ background: '#f8faf8', border: '1px solid #dce5df', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#315a42', letterSpacing: '0.04em' }}>01 / GİRDİ</span>
            <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', background: '#e2ede5', color: '#168347', borderRadius: '4px' }}>ÜRÜN + LOGO</span>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '130px', borderRadius: '8px', overflow: 'hidden', background: '#eef3ef' }}>
            <img
              key={currentItem.source}
              src={currentItem.source}
              alt={currentItem.title}
              loading="lazy"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span style={{ position: 'absolute', bottom: '6px', left: '6px', fontSize: '9px', fontWeight: 600, background: 'rgba(0,0,0,0.68)', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>
              Ham Fotoğraf
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '-4px 0' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#00a884', background: '#fff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dce5df', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>+</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: '#fff', border: '1px solid #dce5df', borderRadius: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '4px', background: '#f4f6f4', border: '1px solid #c9d8ce', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', flexShrink: 0 }}>
              <img src={currentItem.logo} alt={currentItem.brandName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: '11px', color: '#163825', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentItem.brandName}</strong>
              <small style={{ display: 'block', fontSize: '9px', color: '#688272' }}>Vektör Logo</small>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e5f4ec', border: '1px solid #a9d8c1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#168347', fontSize: '14px', fontWeight: 700, boxShadow: '0 3px 8px rgba(0,168,132,0.12)' }}>
            =
          </div>
          <span style={{ fontSize: '8px', fontWeight: 700, color: '#168347', letterSpacing: '0.04em', textAlign: 'center', lineHeight: '1.2' }}>
            AI VEO<br />RENDER
          </span>
        </div>

        <div style={{ background: '#fff', border: '1px solid #dce5df', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#315a42', letterSpacing: '0.04em' }}>02 / ÇIKTI</span>
            <span style={{ fontSize: '9px', fontWeight: 600, padding: '2px 6px', background: '#e5f4ec', color: '#168347', borderRadius: '4px' }}>9:16 VİDEO</span>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '210px', borderRadius: '8px', overflow: 'hidden', background: '#0a140e' }}>
            <video
              key={currentItem.video}
              src={currentItem.video}
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              aria-label="Tamamlanmış ürün reklamı"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              zIndex: 3,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              background: 'rgba(0,0,0,0.72)',
              backdropFilter: 'blur(6px)',
              borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.18)'
            }}>
              <img src={currentItem.logo} alt="" style={{ width: '13px', height: '13px', objectFit: 'contain' }} />
              <span style={{ fontSize: '9px', fontWeight: 600, color: '#fff' }}>{currentItem.brandName}</span>
            </div>

            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              right: '8px',
              zIndex: 3,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 6px',
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(4px)',
              borderRadius: '4px',
              fontSize: '8px',
              color: '#e5f4ec'
            }}>
              <span>WhatsApp Reklamı</span>
              <strong style={{ color: '#00a884' }}>9:16 Veo</strong>
            </div>
          </div>

          <span style={{ fontSize: '10px', color: '#168347', fontWeight: 600, textAlign: 'center' }}>
            Kreatif hazır ✓
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductBento() {
  return (
    <div className="ml-bento">
      <article>
        <h3>İşletme & Müşteri Bulucu</h3>
        <p className="ml-pillar-caption">Civarınızdaki işletmeleri keşfedin, hedef kitlenizi hazırlayın.</p>
        <AudiencePipeline />
      </article>
      <article>
        <h3>Kreatif Reklam Stüdyosu</h3>
        <p className="ml-pillar-context">Ürün fotoğrafından dikey WhatsApp reklamı hazırlayın.</p>
        <BentoCreativeTransform />
      </article>
      <article>
        <h3>Ortak Gelen Kutusu</h3>
        <p className="ml-pillar-caption">Müşteri sipariş ve soruları tek ekranda toplanır.</p>
        <InteractiveLineStory inbox />
      </article>
      <article>
        <h3>Güvenli Altyapı & Hat Desteği</h3>
        <p className="ml-pillar-caption">Büyüyen ekipler için çoklu hat desteği ve korumalı gönderim.</p>
        <InteractiveLineStory />
      </article>
    </div>
  )
}
