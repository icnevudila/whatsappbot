'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ImagePlus, MessageCircle, Pause, Play, Sparkles } from 'lucide-react';
import './opening.css';

const media='/landing/studio/';
const names=['Fotoğraf','Kampanya','Konuşma'];
const subscribeMotion=(notify:()=>void)=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)');
  query.addEventListener('change',notify);
  return ()=>query.removeEventListener('change',notify);
};
const readMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

function ProductPhoto({className=''}:{className?:string}){
  return <div className={`oa-product-photo ${className}`}><div className="oa-paper-top"><span>ÜRÜNLERİM / 01</span><ImagePlus size={13}/></div><Image src={`${media}mori-source.webp`} alt="Mori seramik kupanın sade kaynak fotoğrafı" width={400} height={500} unoptimized/><div className="oa-paper-bottom"><span>Seramik kupa</span><span>mori</span></div></div>;
}

function CampaignArt({className='',priority=false}:{className?:string;priority?:boolean}){
  return <div className={`oa-campaign-art ${className}`}><Image src={`${media}mori-craft-v3.webp`} alt="Mori Atölye için yeni kampanya: eller, kil kıvrımları ve seramik kupanın malzeme hikâyesi. İkili set 690 TL; kurgusal teklif." width={1400} height={1750} unoptimized priority={priority}/></div>;
}

function Conversation({compact=false}:{compact?:boolean}){
  return <div className={`oa-conversation ${compact?'is-compact':''}`}><header><span className="oa-shop-monogram">m.</span><div><b>Mori Atölye</b><span>Örnek WhatsApp konuşması</span></div><MessageCircle size={17}/></header><div className="oa-chat-content"><div className="oa-chat-sent"><div><Image src={`${media}mori-craft-v3.webp`} alt="Konuşmaya eklenen Mori kampanya görseli" width={180} height={225} unoptimized/><span>Küçük bir mola.<br/><b>Büyük bir ritüel.</b></span></div><p>El yapımı seramik kupalarımız 2’li set olarak 690 TL. Koleksiyonu keşfetmek için bize yazın.</p><small>14:32 <Check size={11}/><Check size={11}/></small></div><div className="oa-chat-received">Merhaba, seti yakından görebilir miyim?<small>14:34</small></div><div className="oa-answer"><Sparkles size={12}/><span>Yanıt önerisi hazırlayın.</span><ArrowRight size={13}/></div></div></div>;
}

function HeroStage(){
  const root=useRef<HTMLDivElement>(null);
  const [step,setStep]=useState(1);
  const [mode,setMode]=useState<'auto'|'play'|'pause'>('auto');
  const reduced=useSyncExternalStore(subscribeMotion,readMotion,()=>true);
  const playing=mode==='play'||(mode==='auto'&&!reduced);
  useEffect(()=>{
    let visible=false;
    const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;},{threshold:.2});
    if(root.current)observer.observe(root.current);
    const timer=playing?setInterval(()=>{if(visible&&!document.hidden)setStep(current=>(current+1)%3);},6500):undefined;
    return ()=>{observer.disconnect();if(timer)clearInterval(timer);};
  },[playing]);
  return <div className="oa-stage-wrap" ref={root}>
    <div className={`oa-hero-stage phase-${step}`} role="group" aria-label="Ürün fotoğrafından kampanyaya, kampanyadan konuşmaya temsili dönüşüm">
      <div className="oa-stage-field" aria-hidden="true"><span>İYİ BİR FİKRİN<br/>DEVAMI VAR.</span><i/></div>
      <div className="oa-poster-back" aria-hidden="true"/>
      <CampaignArt className="oa-hero-art" priority/>
      <ProductPhoto className="oa-hero-source"/>
      <div className="oa-hero-ready"><span><Sparkles size={14}/></span><div><b>Ürününüzden ilham aldı.</b><small>Markanızla yeniden tasarlandı.</small></div><Check size={16}/></div>
      <div className="oa-hero-chat"><Conversation compact/></div>
      <div className="oa-hero-reply"><span className="oa-reply-icon"><MessageCircle size={17}/></span><div><b>“Merhaba, seti görebilir miyim?”</b><small>Tanıtımınız bir konuşmaya dönüşsün.</small></div></div>
      <span className="oa-canvas-label">MORI ATÖLYE / KURGUSAL KAMPANYA</span>
    </div>
    <div className="oa-stage-controls"><div aria-label="Dönüşüm aşamasını seçin">{names.map((name,index)=><button type="button" key={name} aria-pressed={step===index} onClick={()=>{setStep(index);setMode('pause');}}><span>0{index+1}</span>{name}</button>)}</div><button type="button" className="oa-pause" aria-label={playing?'Açılış animasyonunu duraklat':'Açılış animasyonunu oynat'} onClick={()=>setMode(playing?'pause':'play')}>{playing?<Pause size={15}/>:<Play size={15}/>}</button></div>
  </div>;
}

export function OpeningHero(){
  return <section className="oa-opening"><div className="oa-opening-inner"><div className="oa-hero-copy"><span className="oa-kicker"><span/>MESAJIFY / ÜRÜNÜNÜZÜ ANLATIN</span><h1>Ürününüz var.<br/><em>Şimdi sahne<br/>onun.</em></h1><p>Fotoğrafınızı reklama dönüştürün.<br/>WhatsApp’tan paylaşın,<br/>konuşmayı başlatın.</p><Link href="https://app.mesajify.com/giris" className="oa-primary">Kendi kampanyanı oluştur<ArrowUpRight size={19}/></Link><Link href="#donusum" className="oa-watch">Bir fotoğraftan neler çıkar?<ArrowDown size={16}/></Link><div className="oa-hero-footnote"><span>01—03</span><p>Bir ürün. Bir fikir.<br/>Yeni bir konuşmanın başlangıcı.</p></div></div><HeroStage/></div><div className="oa-opening-bottom"><span>FOTOĞRAF SİZDEN.</span><span>GÖRSEL → MESAJ → KONUŞMA</span><span>YENİ BİR ANLATIM MESAJIFY’DEN. ↘</span></div></section>;
}

const story=[
  {title:'Siz ürünü gösterin.',text:'Sade bir fotoğrafla başlayın. Ürününüzü, logonuzu ve anlatmak istediğiniz bilgileri ekleyin.',meta:'01 / BAŞLANGIÇ',label:'Kaynak fotoğraf',detail:'Mori · El yapımı seramik kupa'},
  {title:'Ona bir dünya kuralım.',text:'Markanıza ve amacınıza uygun bir görsel hazırlayın. Başlık, ürün ve teklif aynı kampanyanın parçası olsun.',meta:'02 / KREATİF STÜDYO',label:'Kampanya görseli',detail:'Kurgusal örnek · 2’li set / 690 TL'},
  {title:'Konuşma oradan devam etsin.',text:'Görselinizi mesajınızla birlikte WhatsApp’tan paylaşın. Gelen soruları Mesajlar ekranında karşılayın.',meta:'03 / WHATSAPP',label:'Gelen yanıt',detail:'Kurgusal konuşma · Gerçek gönderim yapılmaz'}
];

export function TransformationStory(){
  const root=useRef<HTMLElement>(null);
  const [step,setStep]=useState(0);
  useEffect(()=>{
    const sections=root.current?.querySelectorAll<HTMLElement>('[data-story-step]');
    if(!sections)return;
    const observer=new IntersectionObserver(entries=>{const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);if(visible[0])setStep(Number((visible[0].target as HTMLElement).dataset.storyStep));},{rootMargin:'-28% 0px -38% 0px',threshold:[0,.2,.5,1]});
    sections.forEach(section=>observer.observe(section));return()=>observer.disconnect();
  },[]);
  return <section className="oa-transformation" id="donusum" ref={root}><div className="oa-story-intro"><span className="oa-kicker">AYNI ÜRÜN. BAMBAŞKA BİR ANLATIM.</span><h2>Fotoğraftan<br/><em>fazlası çıksın.</em></h2><p>Bir seramik kupanın yolculuğu.<br/>Üç adımda, aynı hikâyenin devamı.</p></div><div className="oa-story-layout"><div className="oa-story-visual"><div className={`oa-workbench step-${step}`} role="group" aria-label={`Dönüşüm örneği: ${story[step].label}`}><div className="oa-workbench-top"><span><Sparkles size={13}/> MESAJIFY STÜDYO</span><span>ÇALIŞMA / 001</span></div><div className="oa-workbench-art"><span className="oa-workbench-word" aria-hidden="true">{step===0?'ÜRÜN.':step===1?'FİKİR.':'YANIT.'}</span><ProductPhoto className="oa-workbench-source"/><CampaignArt className="oa-workbench-campaign"/><div className="oa-workbench-conversation"><Conversation/></div><span className="oa-workbench-index" aria-hidden="true">0{step+1}</span></div><div className="oa-workbench-bottom"><span><i/>{story[step].label}</span><span>{story[step].detail}</span></div></div><div className="oa-workbench-tabs" aria-label="Dönüşüm örneğini seçin">{names.map((name,index)=><button type="button" key={name} aria-pressed={step===index} onClick={()=>setStep(index)}><span>0{index+1}</span>{name}<ArrowUpRight size={13}/></button>)}</div><p className="oa-demo-note">Mori Atölye, ürün ve fiyat bu anlatım için kurgulandı. Görseller bağımsız üretildi; üretim sonucu taahhüdü değildir.</p></div><div className="oa-story-text">{story.map((item,index)=><article key={item.title} data-story-step={index} className={step===index?'is-active':''}><span className="oa-kicker">{item.meta}</span><h3>{item.title}</h3><p>{item.text}</p>{index===1?<Link href="/kreatif-studyo">Kreatif Stüdyo’yu keşfet<ArrowUpRight size={16}/></Link>:index===2?<Link href="/whatsapp-kampanyalari">Kampanyalara göz at<ArrowUpRight size={16}/></Link>:<span className="oa-story-hint">Aşağı kaydırın<ArrowDown size={15}/></span>}</article>)}</div></div></section>;
}
