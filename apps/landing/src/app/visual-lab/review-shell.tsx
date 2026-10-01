'use client';
import { useEffect, useState } from 'react';
import { MesajifyMark } from '@/components/brand/mesajify-mark';
import { CampaignOrchestrator, LineRoutingEngine, ContactValidationDemo, CreativeTransform, ReplyToInbox, SectorCampaignLab, ProductScreenExplorer, ProductBento } from '@/components/visuals/signature-product-modules';

const modules = [
  {number:'01',name:'Creative Engine',component:CreativeTransform},
  {number:'02',name:'Routing Engine',component:LineRoutingEngine},
  {number:'03',name:'Contact Validation',component:ContactValidationDemo},
  {number:'04',name:'Reply → Inbox',component:ReplyToInbox},
  {number:'05',name:'Campaign Journey',component:CampaignOrchestrator},
  {number:'06',name:'Sector Lab',component:SectorCampaignLab},
  {number:'07',name:'Product Explorer',component:ProductScreenExplorer},
  {number:'08',name:'Bento Moments',component:ProductBento},
];
export default function ReviewShell() {
  const [filter,setFilter]=useState('All'),[hide,setHide]=useState(false),[paused,setPaused]=useState(false);
  const [replays,setReplays]=useState<Record<string,number>>({}),[mobile,setMobile]=useState<Record<string,boolean>>({}),[dark,setDark]=useState<Record<string,boolean>>({});
  useEffect(()=>{document.documentElement.dataset.labPaused=String(paused);window.dispatchEvent(new Event('lab-motion-change'));return()=>{delete document.documentElement.dataset.labPaused;window.dispatchEvent(new Event('lab-motion-change'));};},[paused]);
  useEffect(()=>{const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{(entry.target as HTMLElement).dataset.visible=String(entry.isIntersecting);}),{threshold:.02});document.querySelectorAll('.ml-preview-canvas').forEach(node=>observer.observe(node));return()=>observer.disconnect();},[filter]);
  return <main className={`ml-lab ml-signature-v3 ${hide?'ml-hide-notes':''}`}>
    <header className="ml-review-header"><div><MesajifyMark variant="full" size="md"/><h1>Signature Visuals V3</h1><p>Görsel inceleme · örnek akışlar · gerçek ürün medyası</p></div><a href="/">Landing’e dön ↗</a></header>
    <div className="ml-review-tools"><div className="ml-filter-list" aria-label="Görsel seçimi">{[{number:'All',name:'Tümü'},...modules].map(item=><button key={item.number} aria-pressed={filter===item.number} onClick={()=>setFilter(item.number)}>{item.name}</button>)}</div><div className="ml-review-controls"><button aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'Hareketi oynat':'Hareketi durdur'}</button><label><input type="checkbox" checked={hide} onChange={e=>setHide(e.target.checked)}/>Metinsiz incele</label></div></div>
    <div className="ml-review-list">{modules.filter(item=>filter==='All'||item.number===filter).map(({number,name,component:Component})=><section className="ml-review-item" key={number} id={`module-${number}`}><div className="ml-lab-heading"><span className="ml-module-number">{number}</span><h2>{name}</h2><span className="ml-status">REVIEW</span></div><div className="ml-preview-controls"><button aria-label={`${name} tekrar oynat`} onClick={()=>setReplays({...replays,[number]:(replays[number]||0)+1})}>↻ Tekrar oynat</button><button aria-pressed={!!mobile[number]} onClick={()=>setMobile({...mobile,[number]:!mobile[number]})}>{mobile[number]?'Mobil':'Masaüstü'}</button><button aria-pressed={!!dark[number]} onClick={()=>setDark({...dark,[number]:!dark[number]})}>{dark[number]?'Koyu':'Açık'}</button></div><div className="ml-preview-canvas" data-theme={dark[number]?'dark':'light'} data-device={mobile[number]?'mobile':'desktop'}><Component key={replays[number]||0}/></div></section>)}</div>
  </main>;
}
