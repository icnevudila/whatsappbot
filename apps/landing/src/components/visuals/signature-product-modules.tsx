'use client'
import { useEffect, useRef, useState, useId, type ReactNode, type CSSProperties } from 'react';
import { GeneratedMediaSlot } from './generated-media-slot';
import { MesajifyMark } from '../brand/mesajify-mark';
import { sectors as sectorConfig } from '@/content/sectors';
import { productScreens, inboxScreen } from '@/content/product-screens';

type SignalVariant = 'travel' | 'loading' | 'success' | 'pulse';
const signalPath = 'M9 16h14';
export function MesajifySignal({ variant = 'pulse' }: { variant?: SignalVariant }) {
  return <svg viewBox="0 0 32 32" className={`ml-signal ml-signal-${variant}`} aria-hidden="true"><path className="ml-signal-outline" d={signalPath} pathLength="100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>{variant === 'success' && <path className="ml-signal-check" d="m11 15 4 4 7-8" pathLength="100" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}</svg>;
}
// One low-frequency clock per visible scene. CSS handles travel between story beats.
function useSceneClock(duration = 14, resetKey: string | number = 0, once = false) {
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
      const running = visible && !document.hidden && !media.matches && document.documentElement.dataset.labPaused !== 'true';
      node.dataset.running = String(running);
      node.querySelectorAll('svg').forEach(svg => { if (running) svg.unpauseAnimations?.(); else svg.pauseAnimations?.(); });
      if (running) timer = setInterval(() => setTime(value => {
        if (once && value + .25 >= duration) { if (timer) clearInterval(timer); timer=undefined; return duration; }
        return (value + .25) % duration;
      }), 250);
    };
    setTime(0);
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, { threshold: .08 });
    observer.observe(node); document.addEventListener('visibilitychange', sync); window.addEventListener('lab-motion-change', sync); media.addEventListener('change', sync);
    return () => { if (timer) clearInterval(timer); observer.disconnect(); document.removeEventListener('visibilitychange', sync); window.removeEventListener('lab-motion-change', sync); media.removeEventListener('change', sync); };
  }, [duration, resetKey, once]);
  return { ref, time: reduced ? duration : time, reduced };
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
function Phone({ children }: { children: ReactNode }) { return <div className="ml-phone"><div className="ml-phone-top"><MesajifyMark size="xs" decorative />Mesajify Kampanya</div>{children}</div>; }
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
  return <div ref={ref}><MotionStage className="ml-orchestrator"><Sample>Örnek kampanya yolculuğu</Sample>
    <div className="ml-journey-canvas" data-step={active}>
      <svg viewBox="0 0 1200 800" preserveAspectRatio="none" className="ml-journey-path ml-desktop-path" aria-hidden="true"><path ref={pathRef} d={journey} fill="none" stroke="currentColor" strokeWidth="1.5"/><path d={journey} fill="none" stroke="#168347" strokeWidth="2" pathLength="100" strokeDasharray="100" strokeDashoffset={100-value*100}/><g transform={`translate(${point.x-14} ${point.y-14})`} className="ml-path-signal"><path d={signalPath} fill="none" stroke="#168347" strokeWidth="3" strokeLinecap="round"/></g></svg>
      <svg viewBox="0 0 360 1300" preserveAspectRatio="none" className="ml-journey-path ml-mobile-path" aria-hidden="true"><path ref={mobilePathRef} d="M180 60 C20 180 330 200 180 350 S40 520 180 625 S320 710 180 780 S30 850 180 890 S330 970 180 1040 S20 1150 180 1220" fill="none" stroke="currentColor" strokeWidth="2"/><g transform={`translate(${point.mx-14} ${point.my-14})`}><path d={signalPath} fill="none" stroke="#168347" strokeWidth="3"/></g></svg>
      <div className={`ml-journey-source ${active===0?'is-active':''}`}><span className="ml-object-label">01 / ÜRÜN</span><img src="/landing/studio/product-source-raw.jpg" alt="Ürün fotoğrafı" loading="lazy"/></div>
      <div className={`ml-journey-creative ${active===1?'is-active':''}`}><span className="ml-object-label">02 / KREATİF</span><GeneratedMediaSlot id="real-product-video" alt="Üründen oluşturulan reklam" active={active>=1}/></div>
      <div className={`ml-journey-contacts ${active===2?'is-active':''}`}><span className="ml-object-label">03 / KİŞİLER</span>{['Ayşe Y.','Mehmet K.','Deniz B.'].map((name,i) => <p key={name}><i>{name[0]}</i>{name}<span>✓</span><small>05•• ••• •• {21+i*17}</small></p>)}</div>
      <div className={`ml-journey-lines ${active===3?'is-active':''}`}><span className="ml-object-label">04 / HATLAR</span><MesajifyMark size="sm" state="active" decorative /><svg viewBox="0 0 180 55" aria-hidden="true">{[25,90,155].map(x=><path key={x} d={`M90 0 Q90 25 ${x} 50`} fill="none" stroke="currentColor"/>)}</svg><div><span>Hat 01</span><span>Hat 02</span><span>Hat 03</span></div></div>
      <div className={`ml-journey-message ${active===4?'is-active':''}`}><span className="ml-object-label">05 / MESAJ</span><p>Bofe ürünümüzü keşfedin. Detaylar için bize yazabilirsiniz.<small>İletildi ✓✓</small></p></div>
      <div className={`ml-journey-reply ${active===5?'is-active':''}`}><span className="ml-object-label">06 / YANIT</span><p>Fiyat nedir?</p></div>
      <div className={`ml-journey-inbox ${active===6?'is-active':''}`}><span className="ml-object-label">07 / ORTAK GELEN KUTUSU</span><div><img src="/landing/gelenler.png" alt="Gerçek Inbox ekranı" loading="lazy"/><span className="ml-journey-highlight"/></div></div>
    </div><div className="ml-journey-scrub"><label htmlFor={controlId}>Akışı incele</label><input id={controlId} aria-label="Kampanya yolculuğu ilerlemesi" type="range" min="0" max="100" value={Math.round(value*100)} onChange={e=>setScrub(Number(e.target.value)/100)}/><button onClick={()=>setScrub(null)}>Kaydırmaya bağla</button></div>
  </MotionStage></div>;
}
export function LineRoutingEngine({ ready = true, moment = false }: { ready?: boolean; moment?: boolean }) {
  const {ref,time:elapsed}=useSceneClock(moment?6:14);
  const time=moment?elapsed*14/6:elapsed;
  const drained=Math.min(12,Math.floor(time/1.05));
  const resting = time>=5 && time<10;
  const phase = time>=5 && time<7.5 ? 'redirect' : resting ? 'resting' : 'active';
  const paths=['M500 230 C330 230 190 190 130 330','M500 230 C395 290 380 400 350 450','M500 230 C605 290 620 400 650 450','M500 230 C680 220 830 180 870 330'];
  return <div ref={ref} className="ml-stage ml-routing" data-route-phase={phase} data-ready={ready}><Sample>Örnek hat dağıtımı</Sample>
    <div className="ml-routing-topology"><div className="ml-campaign-queue"><span className="ml-object-label">KAMPANYA KUYRUĞU</span><strong>{ready ? 2418-drained : 0} <small>kişi · demo</small></strong><span className="ml-queue-campaign">Bofe kampanyası</span><div className="ml-queue-capsules">{Array.from({length:12},(_,i)=><i className={i<drained?'is-drained':''} key={i} style={{'--delay':`${i*.2}s`} as CSSProperties}/>)}</div></div>
      <svg viewBox="0 0 1000 560" preserveAspectRatio="none" className="ml-topology-paths" aria-hidden="true"><path d="M500 105 V230" stroke="currentColor" fill="none"/>{paths.map((d,i)=><g key={d} className={i===2?'ml-closing-route':''}><path d={d} fill="none" stroke="currentColor" strokeWidth="1.5"/><g className="ml-message-packet"><rect x="-10" y="-5" width="20" height="10" rx="3" fill="#168347"/><path d="m-6 4-2 4 6-4" fill="#168347"/><animateMotion dur={`${2.8+i*.25}s`} begin={`${i*.35}s`} repeatCount="indefinite" path={d}/></g></g>)}<path className="ml-redirect-path" d="M595 335 C630 355 630 355 630 355 S735 235 870 330" fill="none" stroke="#168347" strokeWidth="1.5"/>{phase==='redirect'&&<g className="ml-redirect-capsule"><rect x="-13" y="-6" width="26" height="12" rx="4" fill="#168347"/></g>}<path className="ml-route-gate" d="m603 365 25-15" stroke="#a88b5d" strokeWidth="3"/></svg>
      <svg viewBox="0 0 360 520" preserveAspectRatio="none" className="ml-topology-mobile" aria-hidden="true"><path d="M180 105 V200" stroke="currentColor" fill="none"/>{['M180 200 C180 240 65 250 65 305','M180 200 C180 370 65 370 65 435','M180 200 C180 370 295 370 295 435','M180 200 C180 240 295 250 295 305'].map((d,i)=><g key={d} className={i===2?'ml-closing-route':''}><path d={d} fill="none" stroke="currentColor"/><g className="ml-message-packet"><rect x="-8" y="-4" width="16" height="8" rx="3" fill="#168347"/><animateMotion dur="3s" begin={i*.35+'s'} repeatCount="indefinite" path={d}/></g></g>)}{phase==='redirect'&&<g className="ml-redirect-capsule-mobile"><rect x="-10" y="-5" width="20" height="10" rx="3" fill="#168347"/></g>}</svg>
      <div className="ml-routing-core"><MesajifyMark size="lg" state={resting?'processing':'active'} decorative /><span>Routing Engine</span></div>
      {['124','98','112','76'].map((load,i)=><div className={`ml-line-terminal ml-terminal-${i+1} ${i===2&&resting?'is-resting':''} ${i===3&&time>=7.5&&time<8.5?'is-receiving':''}`} key={i}><span className="ml-line-indicator"/><strong>Hat 0{i+1}</strong><small>{i===2&&resting?'DİNLENİYOR':i===3?'HAZIR':'AKTİF'}</small><div className="ml-load-meter"><i style={{transform:`scaleX(${i===2&&resting ? .1 : (Number(load)+(i===3&&time>=7.5?1:0))/300})`}}/></div><span className="ml-line-load">{i===2&&resting?'—':`${Number(load)+(i===3&&time>=7.5?1:0)} / 300 · demo`}</span></div>)}
    </div><div className="ml-routing-caption"><span className={resting?'is-active':''}>Hat 03 {resting?'dinleniyor':'aktif'}</span><span>{resting?'→ Hat 01 · 02 · 04':'Dengeli gönderim'}</span></div>
  </div>;
}
export function ContactValidationDemo({ onReady, moment = false }: { onReady?: (ready: boolean) => void; moment?: boolean }) {
  const [run,setRun]=useState(0); const {ref,time:elapsed}=useSceneClock(moment?6:8,run,!moment);const time=moment?elapsed*8/6:elapsed;
  const scanned=Math.min(4, Math.max(0,Math.floor((time-1)/1.5)));
  useEffect(() => { onReady?.(scanned === 4); }, [scanned, onReady]);
  const rows=[['Ayşe Y.','21','Hazır'],['Mehmet K.','84','Kontrol edildi'],['Selin A.','07','Hariç tutuldu'],['Deniz B.','39','Hazır']];
  return <div ref={ref} className="ml-stage ml-validation" data-scanned={scanned}><Sample>Örnek liste</Sample><div className="ml-validation-flow">
    <div className="ml-file" data-entered={time>=.75}><svg viewBox="0 0 60 72" aria-hidden="true"><path d="M8 2h30l14 14v54H8zM38 2v16h14" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M18 32h24M18 42h24M18 52h24M26 27v30" stroke="currentColor"/></svg><strong>musteriler.xlsx</strong><small>4 örnek kayıt</small><div className="ml-file-stack"/></div>
    <div className="ml-scanner" data-current={Math.min(3,Math.max(0,Math.floor((time-1)/1.5)))}><div className="ml-scanner-top"><MesajifyMark size="xs" state={scanned===4?'success':'processing'} decorative /><span>{scanned===4?'Kontrol tamamlandı':'Liste kontrol ediliyor'}</span></div><div className="ml-scan-window" key={run}><div className="ml-scan-line"/>{rows.map(([name,phone,status],i)=><div key={name} className={`ml-scan-row ${Math.floor((time-1)/1.5)===i?'is-crossing':''} ${scanned>i?'is-scanned':''} ${status==='Hariç tutuldu'?'is-excluded':status==='Kontrol edildi'?'is-check':'is-ready'}`} style={{'--row-index':i} as CSSProperties}><i>{name[0]}</i><span>{name}<small>05•• ••• •• {phone}</small></span><strong>{scanned>i?status:'Bekliyor'}</strong></div>)}</div><div className="ml-scan-progress"><i style={{transform:`scaleX(${scanned/4})`}}/></div></div>
    <div className="ml-clean-list"><span className="ml-object-label">KAMPANYA LİSTESİ</span>{rows.filter((row,i)=>scanned>i && row[2]!=='Hariç tutuldu').map(([name,,status])=><p key={name} className={status==='Hariç tutuldu'?'is-excluded':''}><span>{status==='Hariç tutuldu'?'—':'✓'}</span>{name}<small>{status}</small></p>)}<div className="ml-excluded-stack" data-excluded={scanned>=3}>Selin A. · Dahil değil</div><div className="ml-clean-summary" aria-live="polite">{scanned===4?<><MesajifySignal variant="success"/><strong>Kampanyaya hazır</strong></>:<small>Kontrol edilenler burada</small>}</div></div>
  </div>{scanned===4&&<button className="ml-replay" onClick={()=>setRun(run+1)}>↻ Tekrar oynat</button>}</div>;
}
export function CreativeTransform({ scrollDriven = false, moment = false }: { scrollDriven?: boolean; moment?: boolean }) {
  const { ref, time:elapsed } = useSceneClock(moment?6:16);
  const time=moment?elapsed*16/6:elapsed;
  const [scrollProgress, setScrollProgress] = useState(0);
  useEffect(() => {
    if (!scrollDriven) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { const node = ref.current; if (!node) return; const rect = node.getBoundingClientRect(); setScrollProgress(media.matches ? 1 : Math.max(0, Math.min(1, (innerHeight * .78 - rect.top) / (rect.height * .85)))); };
    update(); window.addEventListener('scroll', update, {passive:true}); window.addEventListener('resize', update); media.addEventListener('change',update);
    return () => { window.removeEventListener('scroll',update); window.removeEventListener('resize',update); media.removeEventListener('change',update); };
  }, [scrollDriven, ref]);
  const phase = scrollDriven ? Math.min(4, Math.floor(scrollProgress * 5)) : time < 2 ? 0 : time < 5 ? 1 : time < 7.5 ? 2 : time < 10 ? 3 : 4;
  return <div ref={ref} className="ml-stage ml-transform" data-phase={phase} data-scroll-driven={scrollDriven}>
    <Sample>Görsel dönüşüm örneği</Sample>
    <div className="ml-transform-source"><span className="ml-object-label">Ürün fotoğrafı</span><img src="/landing/studio/product-source-raw.jpg" alt="Bofe tarım ürünü ham fotoğrafı" loading="lazy"/><span className="ml-source-note">Gerçek kaynak fotoğrafı</span></div>
    <div className="ml-transform-process"><div className="ml-engine-heading"><MesajifyMark size="lg" state={phase===4?'success':'processing'} decorative /><span>Creative Engine</span></div>
      <div className="ml-processing-stage"><div className="ml-cinematic-backdrop"/><img className="ml-product-cutout" src="/landing/studio/product-source-raw.jpg" alt="Arka planından maskeyle ayrılan ürün" loading="lazy"/><div className="ml-crop-guide"><i/><i/><i/><i/></div><div className="ml-processing-sweep"/></div>
      <div className="ml-processing-labels">{['SAHNE','VİDEO','SES','ALTYAZI','MARKA'].map((label,i) => <span key={label} className={phase===4?'is-complete':Math.min(4,Math.floor(time/2.4))===i?'is-active':Math.floor(time/2.4)>i?'is-complete':''}>{label}</span>)}</div>
    </div>
    <div className="ml-transform-output"><span className="ml-object-label">02 / WHATSAPP’A HAZIR</span><div className="ml-output-frame"><GeneratedMediaSlot id="real-product-video" alt="Tamamlanmış ürün reklamı" active={phase===4&&time>=11}/><span className="ml-output-tag">9:16 · 8 SN</span></div><span className="ml-output-status">{phase===4?'Kreatif hazır ✓':'Kreatif hazırlanıyor'}</span></div>
  </div>;
}
export function ReplyToInbox() {
  const [run,setRun]=useState(0);
  const { ref, time } = useSceneClock(12,run,true);
  const connectionRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{const node=connectionRef.current;if(!node)return;const observer=new ResizeObserver(()=>node.style.setProperty('--reply-gap',`${node.clientWidth}px`));observer.observe(node);return()=>observer.disconnect();},[]);
  const phase = time < .8 ? 0 : time < 1.5 ? 1 : time < 3.6 ? 2 : time < 4.2 ? 3 : time < 5.6 ? 4 : 5;
  return <div ref={ref} className="ml-stage ml-reply" data-phase={phase}>
    <Sample>Örnek konuşma · gerçek Inbox ekranı</Sample>
    <div className="ml-reply-phone"><Phone><GeneratedMediaSlot id="real-product-video" alt="Kampanya videosu"/><p className="ml-message ml-delivered">Bofe ürünümüzü keşfedin. Detaylar için bize yazabilirsiniz.<small>{phase>=1?'İletildi ✓✓':'Gönderiliyor'}</small></p><div className="ml-typing" aria-label="Müşteri yazıyor"><i/><i/><i/></div><p className="ml-customer ml-phone-reply">Fiyat nedir?</p></Phone><span className="ml-object-label">MÜŞTERİ KONUŞMASI</span></div>
    <div ref={connectionRef} className="ml-reply-connection"><svg viewBox="0 0 200 200" preserveAspectRatio="none" aria-hidden="true"><path d="M0 145 C65 145 100 35 200 35" fill="none" stroke="currentColor" strokeWidth="1"/><path className="ml-reply-trail" d="M0 145 C65 145 100 35 200 35" pathLength="100" fill="none" stroke="#168347" strokeWidth="2"/></svg><span className="ml-travel-reply">Fiyat nedir?</span></div>
    <div className="ml-real-inbox"><div className="ml-browser-bar"><span>● ● ●</span>Mesajify / Gelenler<span className="ml-inbox-notice">Yeni yanıt</span></div><div className="ml-inbox-screen"><img src="/landing/gelenler.png" alt="Gerçek Mesajify Gelen Kutusu ekranı" loading="lazy"/><span className="ml-inbox-row-focus"><i className="ml-unread-dot"/><small className="ml-unread-count">1</small></span><span className="ml-inbox-message-arrival">Fiyat nedir?<small>Örnek yanıt</small></span></div></div>
    {time>=12&&<button className="ml-replay" onClick={()=>setRun(run+1)}>↻ Tekrar oynat</button>}
  </div>;
}
const sectors = sectorConfig.map(item=>({...item,message:item.campaignMessage,reply:item.customerReply}));
export function SectorCampaignLab() {
  const [active,setActive] = useState(0), [displayed,setDisplayed]=useState(0), [changing,setChanging]=useState(false);
  const prefix=useId(); const sector=sectors[displayed]; const {ref,time}=useSceneClock(6,displayed,true);
  useEffect(()=>{ if(active===displayed)return; setChanging(true); const timer=setTimeout(()=>{setDisplayed(active);setChanging(false);},220);return()=>clearTimeout(timer); },[active,displayed]);
  return <div ref={ref} className="ml-stage ml-sector" data-changing={changing} style={{'--sector-accent':sector.accent} as CSSProperties} data-chat-phase={time>=3?'reply':'typing'}>
    <div className="ml-sector-nav" role="tablist" aria-label="Sektörler">{sectors.map((item,i)=><button key={item.id} role="tab" id={`${prefix}-sector-${i}`} aria-controls={`${prefix}-sector-preview`} aria-selected={i===active} tabIndex={i===active?0:-1} onClick={()=>setActive(i)} onKeyDown={e=>{if(['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?sectors.length-1:(active+(['ArrowDown','ArrowRight'].includes(e.key)?1:sectors.length-1))%sectors.length;setActive(next);document.getElementById(`${prefix}-sector-${next}`)?.focus();}}}>{item.label}<span>↗</span></button>)}</div>
    <div id={`${prefix}-sector-preview`} role="tabpanel" aria-labelledby={`${prefix}-sector-${displayed}`} className="ml-sector-preview"><Phone><GeneratedMediaSlot key={sector.id} id={sector.mediaId} alt={`${sector.label} reklam örneği`} active={!changing}/></Phone></div>
    <div className="ml-conversation" key={`chat-${sector.id}`}><Sample>Örnek konuşma · AI reklam medyası</Sample><h3>Bir işletme.<br/>Yeni bir konuşma.</h3><span className="ml-object-label">MESAJIFY KAMPANYASI</span><p className="ml-message">{sector.message}<small>{time>=1.5?'İletildi ✓✓':'Gönderiliyor'}</small></p><div className="ml-typing" aria-label="Müşteri yazıyor"><i/><i/><i/></div><span className="ml-object-label ml-customer-label">MÜŞTERİ</span><p className="ml-customer">{sector.reply}</p><span className="ml-new-reply">Yeni yanıt Mesajify Gelen Kutusu’na düştü.</span></div>
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
  return <MotionStage className="ml-builder"><Sample>Etkileşimli örnek · gerçek gönderim yapmaz</Sample><div className="ml-tabs">{['Kreatif','Kişiler','Hatlar','Gönder'].map((label,i) => <button key={label} aria-pressed={i===step} onClick={() => { setStep(i); setReady(false);setPreparing(false); }}>{i+1} · {label}</button>)}</div><h3>{['Video seçildi','Örnek kişi listesi','Bağlı hatlar','Kampanya özeti'][step]}</h3>
    {step===0&&<div className="ml-builder-form"><label>Kampanya adı<input value="Yeni Koleksiyon" readOnly/></label><div className="ml-builder-video"><GeneratedMediaSlot id="real-product-video" alt="Seçilen kreatif"/></div></div>}
    {step===1&&<label className="ml-builder-field">Kişi listesi<select aria-label="Örnek kişi listesi"><option>Örnek müşteriler · 2.291 kişi</option></select></label>}
    {step===2&&<div className="ml-builder-lines">{lines.map((checked,i)=><label key={i}><input type="checkbox" checked={checked} onChange={e=>{setLines(lines.map((item,index)=>index===i?e.target.checked:item));setReady(false);}}/>Hat 0{i+1}<small>Bağlı · örnek</small></label>)}</div>}
    {step===3&&<div className="ml-builder-summary"><p>Kreatif <span>Video ✓</span></p><p>Kişiler <span>2.291 · örnek</span></p><p>Hatlar <span>{lines.filter(Boolean).length} hat seçildi</span></p></div>}
    <button disabled={preparing||(step===3&&!lines.some(Boolean))} onClick={() => step<3 ? setStep(step+1) : setPreparing(true)}>{preparing?'Kampanya hazırlanıyor…':ready?'Kampanya hazır ✓':step===3?'Örnek kampanyayı hazırla':'Devam →'}</button><span className="ml-builder-feedback" aria-live="polite">{ready?'Örnek kampanya hazır; gönderim yapılmadı.':''}</span>
  </MotionStage>;
}
export function CampaignStatusTicker() {const {ref,time}=useSceneClock(12);const states=['Kreatif hazır','Liste doğrulandı','Hatlar hazır','Kampanya başladı','Yeni yanıt geldi'];const beat=Math.min(4,Math.floor(time/2));return <div ref={ref} className="ml-stage ml-ticker"><Sample>Örnek durumlar · demo</Sample><div className="ml-ticker-list">{states.slice(Math.max(0,beat-2),beat+1).map((label,i)=><div key={label}><span>✓</span>{label}<small>DEMO · 0{Math.max(0,beat-2)+i+1}</small></div>)}</div></div>;}
export function InboxHotspotExplorer() {
  const [active,setActive]=useState(0);const regions=[{label:'Tüm konuşmalar',x:15.5,y:14,w:32,h:78,description:'Konuşmaları tek listede görün.'},{label:'Müşteri bilgisi',x:51,y:15,w:35,h:8,description:'Seçili konuşmanın kişi bilgisini görün.'},{label:'Canlı yanıt',x:51,y:77,w:43,h:10,description:'Yanıtınızı konuşma alanından gönderin.'},{label:'Yanıt geçmişi',x:50,y:27,w:44,h:38,description:'Gönderilen mesaj ve müşteri yanıtını birlikte görün.'}];const region=regions[active];
  return <MotionStage className="ml-hotspots"><div className="ml-hotspot-frame"><img className="ml-hotspot-image" src="/landing/gelenler.png" alt="Gerçek Mesajify Gelen Kutusu" loading="lazy" style={{transform:'scale(1.04)',transformOrigin:`${region.x+region.w/2}% ${region.y+region.h/2}%`}}/><span className="ml-hotspot-shade" style={{left:`${region.x}%`,top:`${region.y}%`,width:`${region.w}%`,height:`${region.h}%`}}/>{regions.map((item,i)=><button className="ml-hotspot-pin" key={item.label} aria-label={item.label} aria-pressed={active===i} onClick={()=>setActive(i)} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} style={{left:`${item.x+item.w/2}%`,top:`${item.y+item.h/2}%`}}>{i+1}</button>)}</div><div className="ml-tabs" aria-label="Inbox bölgeleri">{regions.map((item,i)=><button key={item.label} aria-pressed={active===i} onClick={()=>setActive(i)}>{i+1} · {item.label}</button>)}</div><div className="ml-hotspot-caption"><strong>{region.label}</strong><p>{region.description}</p></div></MotionStage>;
}
export function DeliveryPulse() {
  const stable=(n:number)=>Math.round(n*100)/100;
  const lines=Array.from({length:4},(_,i)=>({x:stable(300+Math.cos(i*Math.PI/2-Math.PI/4)*110),y:stable(230+Math.sin(i*Math.PI/2-Math.PI/4)*85)}));
  return <MotionStage className="ml-pulse"><Sample>Örnek akış · kampanya ve yanıt</Sample><svg viewBox="0 0 600 460" aria-hidden="true"><ellipse cx="300" cy="230" rx="110" ry="85" fill="none" stroke="currentColor"/><ellipse cx="300" cy="230" rx="245" ry="180" fill="none" stroke="currentColor" strokeDasharray="2 8"/>{lines.map((line,i)=><g key={i}><path d={`M300 230 L${line.x} ${line.y}`} stroke="currentColor"/><circle cx={line.x} cy={line.y} r="10" fill="var(--ml-core-bg)" stroke="currentColor"/><text x={line.x} y={line.y+26} textAnchor="middle" fill="var(--ml-muted)" fontSize="8">Hat 0{i+1}</text></g>)}{Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,x=stable(300+Math.cos(a)*245),y=stable(230+Math.sin(a)*180),line=lines[Math.floor(i/3)],d=`M300 230 L${line.x} ${line.y} Q${x} ${line.y} ${x} ${y}`;return <g key={i}><path d={`M${line.x} ${line.y} Q${x} ${line.y} ${x} ${y}`} fill="none" stroke="currentColor"/><path d={d} stroke="#91ad9a" fill="none" pathLength="100" className={`ml-packet ${i%4===0?'ml-inbound':''}`} style={{animationDelay:`${i*.3}s`}}/><circle cx={x} cy={y} r="6" fill="var(--ml-core-bg)" stroke="currentColor"/></g>;})}</svg><div className="ml-pulse-core"><MesajifyMark size="md" decorative /><strong>Mesajify</strong></div><span className="ml-pulse-reply">Fiyat?</span><span className="ml-pulse-reply">Bilgi alabilir miyim?</span><span className="ml-pulse-reply">Mevcut mu?</span></MotionStage>;
}
export function FinalJourney() {return <MotionStage className="ml-final"><Sample>Mesajify kampanyası · örnek konuşma</Sample><svg className="ml-final-path" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true"><path d="M100 350 C300 200 350 400 550 300 S850 180 1100 330" fill="none" stroke="currentColor"/><path d="M100 350 C300 200 350 400 550 300 S850 180 1100 330" fill="none" stroke="#168347" pathLength="100" className="ml-packet"/></svg><div className="ml-final-photo"><span className="ml-object-label">ÜRÜN FOTOĞRAFI</span><img src="/brand/mesajify-official-logo.png" alt="Mesajify tanıtım görseli"/></div><div className="ml-final-video"><Phone><GeneratedMediaSlot id="real-product-video" alt="Mesajify kampanya reklamı"/><p className="ml-message">Mesajify çözümlerimizi keşfedin. Detaylar için bize yazabilirsiniz.<small>İletildi ✓✓</small></p></Phone></div><p className="ml-customer">Fiyat nedir?</p><MesajifyMark size="md" state="active" className="ml-final-mark" decorative /><div className="ml-final-inbox"><span className="ml-object-label">MESAJIFY GELEN KUTUSU</span><img src="/landing/gelenler.png" alt="Yanıtların yönetildiği gerçek Mesajify ekranı"/><span>Yeni yanıt · Fiyat nedir?</span></div></MotionStage>;}
export function ProductBento() {const {ref,time}=useSceneClock(6);return <div ref={ref} className="ml-stage ml-bento ml-signature-moments" data-moment={time>=2.5?'arrived':'travel'}>
<article><h3>Dengeli gönderim</h3><div className="ml-moment-routing"><span>Hat 03<small>Dinleniyor</small></span><MesajifyMark size="sm" state="processing" decorative/><i className="ml-moment-packet"/><span>Hat 04<small>{time>=2.5?'77 / 300 · demo':'76 / 300 · demo'}</small></span></div></article>
<article><h3>Fotoğraftan reklama</h3><div className="ml-moment-creative"><img src="/brand/mesajify-official-logo.png" alt="Gerçek Mesajify logosu" loading="lazy"/><span>→</span><GeneratedMediaSlot id="real-product-video" alt="Mesajify reklamı" active={time>=2.5}/></div></article>
<article><h3>Temiz kampanya listesi</h3><div className="ml-moment-list"><p>Ayşe Y.<span>✓</span></p><p>Mehmet K.<span>✓</span></p><p>Deniz B.<span>✓</span></p><strong>{time>=2.5?'3 kişi · Hazır':'Liste kontrol ediliyor'}</strong></div></article>
<article><h3>Ortak gelen kutusu</h3><div className="ml-moment-inbox"><span className="ml-moment-packet">Fiyat nedir?</span><MesajifyMark size="md" state={time>=2.5?'success':'idle'} decorative/><strong>{time>=2.5?'1 yeni yanıt':'Gelen Kutusu'}</strong></div></article></div>;}
