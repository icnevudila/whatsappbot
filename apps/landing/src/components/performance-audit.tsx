'use client';
import { useEffect } from 'react';
/** Opt-in local audit. No network calls, cookies or production telemetry. */
export function PerformanceAudit() {
  useEffect(()=>{
    if(!new URLSearchParams(location.search).has('audit')) return;
    const target=document.documentElement;
    const observers:PerformanceObserver[]=[];
    let cls=0,session=0,first=0,last=0,maxInteraction=0;
    const observe=(type:string,callback:(entries:PerformanceEntry[])=>void)=>{
      if(!PerformanceObserver.supportedEntryTypes.includes(type))return;
      const observer=new PerformanceObserver(list=>callback(list.getEntries()));
      observer.observe({type,buffered:true,...(type==='event'?{durationThreshold:16}:{})});observers.push(observer);
    };
    observe('largest-contentful-paint',entries=>{target.dataset.auditLcp=String(Math.round(entries.at(-1)?.startTime||0));});
    observe('layout-shift',entries=>{for(const entry of entries){const shift=entry as PerformanceEntry & {hadRecentInput:boolean;value:number};if(shift.hadRecentInput)continue;if(entry.startTime-last>1000||entry.startTime-first>5000){session=0;first=entry.startTime;}session+=shift.value;last=entry.startTime;cls=Math.max(cls,session);}target.dataset.auditCls=cls.toFixed(4);});
    observe('event',entries=>{for(const entry of entries){const event=entry as PerformanceEntry & {interactionId?:number};if(event.interactionId)maxInteraction=Math.max(maxInteraction,event.duration);}target.dataset.auditInteraction=String(maxInteraction);});
    target.dataset.auditCls='0';target.dataset.auditInteraction='0';
    return()=>{observers.forEach(observer=>observer.disconnect());delete target.dataset.auditLcp;delete target.dataset.auditCls;delete target.dataset.auditInteraction;};
  },[]);
  return null;
}
