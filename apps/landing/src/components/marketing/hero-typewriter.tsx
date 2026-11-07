'use client';
import {useEffect,useRef,useState} from 'react';
const phrases=['WhatsApp’tan ulaşın.\nTek panelden yönetin.','Listenizi hazırlayın.\nMesajınızı planlayın.','Yanıtları karşılayın.\nKonuşmayı sürdürün.'];
export function TypewriterPhrase(){
 const [text,setText]=useState(phrases[0]),node=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');let visible=false,cancelled=false,index=0,count=phrases[0].length,erasing=true,timer:ReturnType<typeof setTimeout>;
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting});if(node.current)observer.observe(node.current);
  const tick=()=>{if(cancelled)return;if(!visible||document.hidden){timer=setTimeout(tick,250);return}if(reduced.matches){index=0;count=phrases[0].length;erasing=true;setText(phrases[0]);timer=setTimeout(tick,1000);return}let delay=65;if(erasing){count=Math.max(0,count-1);setText(phrases[index].slice(0,count));delay=34;if(count===0){index=(index+1)%phrases.length;erasing=false;delay=160}}else{count=Math.min(phrases[index].length,count+1);setText(phrases[index].slice(0,count));if(count===phrases[index].length){erasing=true;delay=3100}}timer=setTimeout(tick,delay)};
  timer=setTimeout(tick,3100);return()=>{cancelled=true;clearTimeout(timer);observer.disconnect()};
 },[]);
 const lines=text.split("\n"),active=lines.length>1?1:0;
 return <span ref={node} className="hero-typewriter" aria-hidden="true"><span className="hero-typewriter-line"><span className="hero-typewriter-run">{lines[0]}{active===0&&<i/>}</span></span><em className="hero-typewriter-line"><span className="hero-typewriter-run">{lines[1]||""}{active===1&&<i/>}</span></em></span>;
}
