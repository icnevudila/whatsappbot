'use client';
import {useState,useId,useEffect,useRef} from 'react';
import {replyExamples,campaignExamples} from './story-messages';
import {MesajifyMark} from '../brand/mesajify-mark';
import {IconWhatsAppLine, IconChatReply, IconSendCampaign, IconCheckCircle} from './story-icons';

export function InteractiveLineStory({inbox=false}:{inbox?:boolean}) {
 const [tick,setTick]=useState(0);const replies=[0,1,2].map(i=>replyExamples[(Math.floor(tick/3)*3+i)%replyExamples.length]);
 const [line,setLine]=useState(0),[automatic,setAutomatic]=useState(true);const id=useId();const ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{const node=ref.current;if(!node)return;if(!automatic){node.dataset.running="false";return;}const media=matchMedia('(prefers-reduced-motion: reduce)');let visible=false;let timer:ReturnType<typeof setInterval>|undefined;const sync=()=>{if(timer)clearInterval(timer);timer=undefined;const running=visible&&!document.hidden&&!media.matches&&document.documentElement.dataset.labPaused!=='true'&&node.closest('[data-story-paused]')?.getAttribute('data-story-paused')!=='true';node.dataset.running=String(running);if(running)timer=setInterval(()=>{setLine(value=>(value+1)%3);setTick(value=>value+1)},1800)};const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()});observer.observe(node);document.addEventListener('visibilitychange',sync);window.addEventListener('lab-motion-change',sync);media.addEventListener('change',sync);return()=>{if(timer)clearInterval(timer);observer.disconnect();document.removeEventListener('visibilitychange',sync);window.removeEventListener('lab-motion-change',sync);media.removeEventListener('change',sync)}},[automatic]);
 return <div ref={ref} className="ml-interactive-lines">
  <div className="ml-line-selector" role="group" aria-label={inbox?'Yanıtın kaynak hattı':'Gönderim hattı'}>
    {[0,1,2].map(i=><button key={i} aria-pressed={line===i} onClick={()=>{setAutomatic(false);setLine(i)}}>
      <div className="ml-line-selector-btn">
        <IconWhatsAppLine className="ml-line-wa-icon" />
        <div>
          <span>Hat 0{i+1}</span>
          <small>{line===i?'Seçili hat':'Hattı incele'}</small>
        </div>
      </div>
    </button>)}
  </div>
  <div className="ml-interactive-map" data-inbox={inbox}>
    <svg viewBox="0 0 600 220" preserveAspectRatio="none" aria-hidden="true">
      <defs><marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#168347" strokeWidth="1.5"/></marker></defs>
      {[45,110,175].map((y,i)=><path key={i} d={inbox?`M90 ${y} C230 ${y} 300 110 430 110`:`M170 110 C300 110 360 ${y} 510 ${y}`} className={line===i?"ml-active-route":""} pathLength="100" fill="none" stroke={line===i?'#168347':'#d1ded4'} strokeWidth={line===i?2.5:1.3} markerEnd={line===i?`url(#${id})`:undefined}/>)}
    </svg>
    <div className={inbox?'ml-interactive-destination':'ml-interactive-source'}>
      <MesajifyMark size="lg" decorative/>
      <strong>{inbox?'Tek Inbox':'Mesajify tanıtımı'}</strong>
      <small>{inbox?'Ortak Gelen Kutusu':'Seçili kitle → bağlı hatlar'}</small>
    </div>
    <div className="ml-interactive-terminals">
      {[0,1,2].map(i=><span key={i} data-selected={line===i}>Hat 0{i+1}<small>{inbox?replies[i]:'Bağlı WhatsApp hattı'}</small></span>)}
    </div>
    <div key={tick+"-"+line} className="ml-route-message">
      <span className="ml-route-message-avatar">
        {inbox ? <IconChatReply className="w-4 h-4" /> : <IconSendCampaign className="w-4 h-4" />}
      </span>
      <div>
        <small>{inbox?`HAT 0${line+1} · YENİ YANIT`:`HAT 0${line+1} · TANITIM MESAJI`}</small>
        <strong>{inbox?replies[line]:campaignExamples[tick%campaignExamples.length]}</strong>
        <span>{inbox?"Ortak Gelen Kutusu’na ulaştı":"Kreatif ile birlikte gönderim akışı"} <IconCheckCircle className="inline-block w-3.5 h-3.5 text-[#168347] ml-1 align-text-bottom" /></span>
      </div>
    </div>
  </div>
  <p aria-live={automatic?"off":"polite"}>{inbox?`Hat 0${line+1} yanıtı → ortak Gelen Kutusu`:`Tanıtım → Hat 0${line+1} → seçili kitle`}</p>
 </div>;
}
