'use client';
import {campaignExamples} from './story-messages';
import { useEffect, useId, useRef, useState } from 'react';
import { CampaignScene } from './campaign-scene';
import { ApprovedScreenshot } from './approved-screen-gallery';
import { MesajifyMark } from '../brand/mesajify-mark';
import { GeneratedMediaSlot } from './generated-media-slot';

export function AudienceRequest() {
  const [requested,setRequested]=useState(false);
  return <form className="ml-audience-request" onSubmit={e=>{e.preventDefault();setRequested(true);}}>
    <span className="ml-object-label">İŞLETME & MÜŞTERİ BULUCU</span><h3>Civarınızdaki İşletmeleri Bulun</h3>
    <p>Türkiye’de ve dünyada hedeflediğiniz bölge ve sektördeki işletmeleri tek tıkla listeleyin. Doğrulanmış WhatsApp numaraları doğrudan tanıtım kitlenize eklensin.</p>
    <label>Hedef Sektör<input name="sector" placeholder="Örn: Kuaför, Kafe, Restoran, Toptancı, İnşaat" required onChange={()=>setRequested(false)}/></label>
    <label>Şehir / İlçe<input name="region" placeholder="Örn: Kadıköy / İstanbul veya Tüm Türkiye" required onChange={()=>setRequested(false)}/></label>
    <details className="ml-request-criteria"><summary>Ek arama kriterleri (isteğe bağlı)</summary><label>Kriterler<textarea name="criteria" placeholder="Örn: Belirli caddeler, sadece aktif WhatsApp kullanıcıları" onChange={()=>setRequested(false)}/></label></details>
    <button type="submit">İşletmeleri Bul & Listele →</button>
    <small>Etkileşimli demo · Doğrulanmış işletme veritabanı.</small>
    <output aria-live="polite">{requested?'Hedef İşletmeler Bulundu · 1.420 doğrulanmış WhatsApp numarası kitlenize eklendi!':''}</output>
  </form>;
}

export function BrandContext() {
  return <div className="ml-brand-context"><span className="ml-object-label">MARKA + ÜRÜN</span><dl><div><dt>Marka</dt><dd>Bofe</dd></div><div><dt>Marka Kiti</dt><dd>Hazır ✓</dd></div><div><dt>Logo / Renkler</dt><dd>✓ / ✓</dd></div><div><dt>Ürün</dt><dd>Akülü Sırt Pompası</dd></div></dl><small>Bofe tanıtımı · örnek marka bağlamı</small></div>;
}

const stages=['KREATİF','KİTLE','HATLAR','GÖNDERİM'];
export function CampaignControlCenter({ compact=false }: {compact?:boolean}) {
  const [stage,setStage]=useState(0),[audience,setAudience]=useState<'upload'|'request'>('upload'),[prepared,setPrepared]=useState(false),[launched,setLaunched]=useState(false),[arrived,setArrived]=useState(false);
  const id=useId(),ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!launched)return;
    const node=ref.current;if(!node)return;
    let timer:ReturnType<typeof setTimeout>|undefined,started=0,remaining=3600,visible=false;
    const sync=()=>{if(timer){clearTimeout(timer);timer=undefined;remaining=Math.max(0,remaining-(performance.now()-started));}const running=visible&&!document.hidden&&document.documentElement.dataset.labPaused!=='true';node.dataset.running=String(running);if(running){started=performance.now();timer=setTimeout(()=>setArrived(true),remaining);}};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){setArrived(true);return;}
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync();});observer.observe(node);document.addEventListener('visibilitychange',sync);window.addEventListener('lab-motion-change',sync);
    return()=>{observer.disconnect();if(timer)clearTimeout(timer);document.removeEventListener('visibilitychange',sync);window.removeEventListener('lab-motion-change',sync);};
  },[launched]);
  return <div ref={ref} className={`ml-control-center ${compact?'is-compact':''}`} data-launched={launched} data-arrived={arrived}>
    <svg className="ml-control-links" viewBox="0 0 640 560" preserveAspectRatio="none" aria-hidden="true"><path d="M305 185 C470 150 485 80 555 100 M305 240 Q180 430 140 455 M305 260 Q380 430 500 455" fill="none" stroke="currentColor"/>{launched&&!arrived&&[80,115,150].map(y=><path key={y} d={`M305 185 C440 180 470 ${y} 555 ${y}`} className="ml-control-packet" fill="none" stroke="#168347" strokeWidth="5" pathLength="100"/>)}</svg>
    <div className="ml-control-builder"><header><MesajifyMark size="xs" decorative/><div><strong>Yeni Tanıtım</strong><small>Mesajify Tanıtım Kontrol Merkezi</small></div></header>
      <div className="ml-control-tabs" role="tablist" aria-label="Tanıtım aşamaları">{stages.map((label,i)=><button key={label} id={`${id}-tab-${i}`} role="tab" aria-selected={stage===i} aria-controls={`${id}-panel`} tabIndex={stage===i?0:-1} onClick={()=>setStage(i)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?3:(stage+(e.key==='ArrowRight'?1:3))%4;setStage(next);document.getElementById(`${id}-tab-${next}`)?.focus();}}}><span>0{i+1}</span>{label}</button>)}</div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${stage}`} className="ml-control-body">
        {stage===0&&<><BrandContext/><div className="ml-control-creative"><GeneratedMediaSlot id="real-product-video" alt="Bofe 9:16 tanıtım önizlemesi"/><small>9:16 · Kreatif</small></div><div className="ml-control-actions"><button onClick={()=>setPrepared(true)}>Görsel Oluştur</button><button onClick={()=>setPrepared(true)}>Video Oluştur</button><span aria-live="polite">{prepared?'Mevcut Bofe kreatifi seçildi · örnek':'Mevcut kreatif ile akışı inceleyin'}</span></div></>}
        {stage===1&&<div className="ml-control-audience"><div className="ml-control-choices"><button aria-pressed={audience==='upload'} onClick={()=>setAudience('upload')}>Liste Yükle <small>Excel / CSV</small></button><button aria-pressed={audience==='request'} onClick={()=>setAudience('request')}>Liste Talep Et <small>Değerlendirme akışı</small></button></div>{audience==='upload'?<div className="ml-control-list"><strong>musteriler.xlsx</strong><p>Liste → kontrol → tanıtım kitlesi</p><small>Kendi listenizi hazırlayın · örnek akış</small></div>:<AudienceRequest/>}</div>}
        {stage===2&&<div className="ml-control-line-panel"><strong>Bir panel. Birden fazla WhatsApp hattı.</strong>{[1,2,3].map(i=><p key={i}><span>Hat 0{i}</span><b>BAĞLI</b></p>)}<small>Bağlantı durumları örnektir.</small></div>}
        {stage===3&&<div className="ml-control-launch"><strong>Bofe tanıtımı</strong><p>Kreatif ✓</p><p>{audience==='request'?'Kitle · Değerlendirme bekleniyor':'Kitle ✓'} <small>{audience==='request'?'Liste talebi':'Örnek müşteri listesi'}</small></p><p>Hatlar ✓ <small>Hat 01 · Hat 02 · Hat 03</small></p><button disabled={audience==='request'} onClick={()=>{setLaunched(!launched);setArrived(false);}}>{launched?'Akışı sıfırla':'Tanıtımı Başlat'}</button><span aria-live="polite">{audience==='request'?'Talep değerlendirilip kitle hazırlandıktan sonra gönderim yapılır.':arrived?'Yanıt ortak Gelen Kutusu’nda · örnek':launched?'Bağlı hatlara dağıtılıyor · örnek':'Örnek akış · gerçek gönderim yapılmaz'}</span></div>}
      </div>
      <footer>Kreatif → Kitle → Bağlı Hatlar → Gönderim</footer>
    </div>
    <aside className="ml-control-lines" aria-label="Bağlı WhatsApp hatları"><span className="ml-object-label">BAĞLI WHATSAPP HATLARI</span>{[1,2,3].map(i=><p key={i}><i/><strong>Hat 0{i}</strong><small>{launched&&!arrived?'GÖNDERİM · ÖRNEK':'BAĞLI'}</small></p>)}<small className="ml-control-demo">Örnek hat durumları</small></aside>
    <div className="ml-control-audience-orbit"><span className="ml-object-label">KİŞİ LİSTESİ</span><div><i>AY</i><i>MK</i><i>DB</i></div><p>Liste yükle <span>veya</span> liste talep et</p></div>
    <div className="ml-control-inbox-orbit"><span className="ml-object-label">ORTAK GELEN KUTUSU</span><small>Hat 01 · Hat 02 · Hat 03 → Tek Inbox</small><p>“Fiyat nedir?”</p><MesajifyMark size="xs" state={arrived?'success':'idle'} decorative/></div>
  </div>;
}

export function ConnectedLineDistribution({ready}:{ready:boolean}) {
  const ref=useRef<HTMLDivElement>(null);const [beat,setBeat]=useState(0);
  useEffect(()=>{const node=ref.current;if(!node)return;let visible=false;let timer:ReturnType<typeof setInterval>|undefined;const media=matchMedia('(prefers-reduced-motion: reduce)');const sync=()=>{if(timer)clearInterval(timer);timer=undefined;const running=ready&&visible&&!document.hidden&&!media.matches&&document.documentElement.dataset.labPaused!=='true'&&node.closest('[data-story-paused]')?.getAttribute('data-story-paused')!=='true';node.dataset.running=String(running);if(running)timer=setInterval(()=>setBeat(value=>value+1),1400)};const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()},{threshold:.01});observer.observe(node);document.addEventListener('visibilitychange',sync);window.addEventListener('lab-motion-change',sync);media.addEventListener('change',sync);return()=>{if(timer)clearInterval(timer);observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('lab-motion-change',sync);media.removeEventListener('change',sync)}},[ready]);
  return <div ref={ref} className="ml-line-operations" data-ready={ready}><div className="ml-line-operations-header"><span>Tanıtım / Bağlı Hatlar</span><small>Bofe tanıtımı · örnek gönderim akışı</small></div><div className="ml-line-operations-surface"><svg className="ml-line-desktop-paths" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true"><circle className="ml-routing-ring" cx="430" cy="280" r="75"/><circle className="ml-routing-ring ml-routing-ring-outer" cx="430" cy="280" r="105"/><path d="M250 280 H430" fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="270" cy="280" r="4" fill="#168347"/>{[75,210,345,480].map((y,i)=>{const d=`M430 280 C620 280 650 ${y} 820 ${y}`;return <g key={y}><path d={d} fill="none" stroke="currentColor" strokeWidth="1.5"/><circle cx="660" cy={y} r="4" fill={i<3?"#168347":"#b8c8bd"}/>{i<3&&<path d={d} className="ml-line-activity" pathLength="100" stroke="#168347" strokeWidth="7" strokeLinecap="round" fill="none" style={{animationDelay:i*.5+'s'}}/>}</g>;})}</svg><svg className="ml-line-mobile-paths" viewBox="0 0 360 680" preserveAspectRatio="none" aria-hidden="true">{[295,420,545].map((y,i)=>{const d=`M270 100 C315 170 315 ${y} 250 ${y}`;return <g key={y}><path d={d} fill="none" stroke="currentColor"/><path d={d} className="ml-line-activity" pathLength="100" stroke="#168347" strokeWidth="6" strokeLinecap="round" fill="none" style={{animationDelay:i*.5+'s'}}/></g>;})}</svg><div className="ml-line-queue"><span className="ml-object-label">TANITIM KUYRUĞU</span><strong>Bofe tanıtımı</strong><p>{ready?'Tanıtım kitlesi hazır':'Kitle kontrol ediliyor'}</p><div>{Array.from({length:8},(_,i)=><i key={i}/>)}</div></div><div className="ml-line-core"><MesajifyMark size="lg" state={ready?'active':'idle'} decorative/><strong>Tek Mesajify paneli</strong></div><div className="ml-line-rows">{[1,2,3,4].map(i=><div key={i} data-active={ready&&i===beat%3+1}><i/><strong>Hat 0{i}</strong><span>{i===4?'HAZIR':'BAĞLI'}</span><small>{i===4?'Gönderime uygun hat':ready&&i===beat%3+1?campaignExamples[beat%campaignExamples.length]:'Bağlı WhatsApp hattı'}</small></div>)}</div></div><div className="ml-distribution-events" data-ready={ready}>{["Kreatif tanıtıma eklendi","Mesaj bağlı hatta ilerliyor","Seçili kitleye gönderim akışı"].map((text,i)=><div key={text} style={{animationDelay:i*1.2+"s"}}><small>HAT 0{i+1} · ÖRNEK</small><strong>{ready?campaignExamples[(beat+i)%campaignExamples.length]:"Kitle hazırlığı bekleniyor"}</strong><span>✓</span></div>)}</div><p className="ml-line-operations-note">Bir tanıtım → seçili kitle → birden fazla bağlı WhatsApp hattı. Gösterilen hareketler örnektir.</p></div>;
}

function PreviousCampaignOperatingJourney() {
  return <div className="ml-operating-journey"><svg viewBox="0 0 1200 720" preserveAspectRatio="none" aria-hidden="true"><path d="M130 190 C250 190 290 170 440 170 M560 170 C660 170 690 190 830 190 M950 300 C950 380 120 350 120 470 M270 550 H450 M610 550 H780" fill="none" stroke="currentColor"/></svg>
    <div className="ml-operating-top"><BrandContext/><div className="ml-operating-creative"><span className="ml-object-label">01 / KREATİF</span><GeneratedMediaSlot id="real-product-video" alt="Bofe tanıtım kreatifi"/><strong>Görsel / Video</strong></div><div className="ml-operating-audience"><span className="ml-object-label">02 / KİTLE</span><h3>Tanıtım kitlesi</h3><div><p>Liste Yükle<small>Excel / CSV → kontrol</small></p><p>Liste Talep Et<small>Talep → değerlendirme</small></p></div><small>Talep edilen liste, değerlendirme ve hazırlık sonrası tanıtıma dahil edilir.</small></div></div>
    <div className="ml-operating-bottom"><div className="ml-operating-launch"><span className="ml-object-label">03 / TANITIM</span><strong>Bağlı hatları seçin.</strong><p>Tanıtımı başlatın.</p><MesajifyMark size="md" state="active" decorative/><div>{[1,2,3].map(i=><span key={i}>Hat 0{i}<small>BAĞLI</small></span>)}</div><small>→ Seçili kitleye tanıtım gönderimi</small></div><div className="ml-operating-reply"><span className="ml-object-label">04 / MÜŞTERİ YANITI</span><p>Fiyat nedir?</p><small>Hat 01 · Hat 02 · Hat 03 →</small></div><div className="ml-operating-inbox"><span className="ml-object-label">05 / ORTAK GELEN KUTUSU</span><ApprovedScreenshot/><strong>Yanıtlar tek panelde.</strong></div></div>
  </div>;
}

export function CampaignOperatingJourney(){return <CampaignScene/>}
