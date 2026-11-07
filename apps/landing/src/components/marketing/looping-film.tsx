'use client';
import {useEffect,useRef,useState} from 'react';
import Image from 'next/image';
const base='/landing/studio/';
const revision='20261107-clean-copy-v8';
const playbackRates:Record<string,number>={launch:1.5,showcase:1.8};
export function LoopingFilm({name,label,priority=false}:{name:string;label:string;priority?:boolean}){
 const box=useRef<HTMLDivElement>(null),movie=useRef<HTMLVideoElement>(null),source=useRef('');
 const [src,setSrc]=useState(''),[ready,setReady]=useState(false);
 useEffect(()=>{
  const video=movie.current;if(!video)return;
  let visible=false,disposed=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:760px)');
  const playback=()=>{if(disposed)return;if(!visible||document.hidden||reduced.matches){video.pause();if(reduced.matches)setReady(false);return}video.muted=true;video.defaultPlaybackRate=playbackRates[name]??1;video.playbackRate=video.defaultPlaybackRate;const token=source.current;video.play().then(()=>{if(!disposed&&visible&&!reduced.matches&&token===source.current)setReady(true)}).catch(()=>{if(!disposed&&token===source.current)setReady(false)})};
  const sync=()=>{if(visible){const next=base+name+(mobile.matches?'-mobile':'')+'.mp4?v='+revision;if(source.current!==next){source.current=next;setReady(false);setSrc(next);return}}playback()};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()},{threshold:.1});if(box.current)observer.observe(box.current);
  video.addEventListener('loadedmetadata',playback);video.addEventListener('loadeddata',playback);document.addEventListener('visibilitychange',sync);mobile.addEventListener('change',sync);reduced.addEventListener('change',sync);
  return()=>{disposed=true;observer.disconnect();video.pause();video.removeEventListener('loadedmetadata',playback);video.removeEventListener('loadeddata',playback);document.removeEventListener('visibilitychange',sync);mobile.removeEventListener('change',sync);reduced.removeEventListener('change',sync)};
 },[name]);
 return <div className="ms-film-wrap"><div ref={box} data-film={name} className={'ms-film '+(ready?'is-ready':'')} role="group" aria-label={label+' — temsili ürün anlatımı'}><picture><source media="(max-width:760px)" srcSet={base+name+'-mobile-poster.jpg'}/><Image src={base+name+'-poster.jpg'} alt={label+' — temsili ürün anlatımı'} width={1400} height={700} unoptimized priority={priority}/></picture><video ref={movie} src={src||undefined} autoPlay muted loop playsInline preload={priority?'auto':'metadata'} disablePictureInPicture disableRemotePlayback aria-hidden="true" onError={()=>setReady(false)}/></div></div>;
}
