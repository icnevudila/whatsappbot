'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

type Phase = 1 | 2 | 3 | 4 | 5;

export function PhoneSimulator() {
  const [phase, setPhase] = useState<Phase>(1);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let startTime = Date.now();
    const duration = 12000; // 12 seconds total

    const updatePhase = () => {
      const elapsed = (Date.now() - startTime) % duration;
      
      if (elapsed < 2000) setPhase(1);      // 0-2s: Source image
      else if (elapsed < 5000) setPhase(2); // 2-5s: Generation UI
      else if (elapsed < 8000) setPhase(3); // 5-8s: Video plays
      else if (elapsed < 10000) setPhase(4); // 8-10s: WA message
      else setPhase(5);                     // 10-12s: Inbox notification
      
      if (elapsed >= 2000 && elapsed < 5000) {
        setProgress(Math.min(100, ((elapsed - 2000) / 3000) * 100));
      }
    };

    const interval = setInterval(updatePhase, 50);
    return () => clearInterval(interval);
  }, []);

  const getGenerationText = () => {
    if (progress < 25) return 'Sahneler hazırlanıyor…';
    if (progress < 60) return 'Seslendirme hazırlanıyor…';
    if (progress < 90) return 'Altyazılar ekleniyor…';
    return 'Reklam hazır ✓';
  };

  return (
    <div className="relative w-full aspect-[9/19.5] bg-[#090B0A] rounded-[40px] p-[6px] shadow-2xl ring-1 ring-hairline-strong">
      {/* Phone Screen */}
      <div className="relative w-full h-full bg-white rounded-[34px] overflow-hidden flex flex-col">
        
        {/* Status Bar */}
        <div className="h-12 w-full flex items-center justify-between px-6 pt-2 z-20 text-xs font-medium text-black bg-white">
          <span>09:41</span>
          <div className="w-[120px] h-7 bg-black rounded-full absolute left-1/2 -translate-x-1/2 top-1 z-30"></div>
          <div className="flex gap-1.5 items-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
              <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
              <line x1="12" y1="20" x2="12.01" y2="20"></line>
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="7" width="16" height="10" rx="2" ry="2"></rect>
              <line x1="22" y1="11" x2="22" y2="13" stroke="currentColor" strokeWidth="2"></line>
            </svg>
          </div>
        </div>

        {/* Chat Header */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3 border-b border-gray-200 z-10">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
            <Image src="/logos/mesajify_app_icon_corporate_squircle.png" width={24} height={24} alt="Mesajify" className="rounded-md" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h3 className="font-semibold text-[15px] text-gray-900 leading-tight">Mesajify Demo</h3>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e">
                <circle cx="12" cy="12" r="12" />
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="white" />
              </svg>
            </div>
            <p className="text-xs text-gray-500">İşletme Hesabı</p>
          </div>
        </div>

        {/* Chat Content Area */}
        <div className="flex-1 relative bg-[#efeae2] p-4 flex flex-col gap-4 overflow-hidden">
          
          {/* Phase 1 & 2: Generation */}
          <div className={`transition-opacity duration-300 ${phase <= 2 ? 'opacity-100' : 'opacity-0 hidden'}`}>
             <div className="bg-white p-2 rounded-xl rounded-tl-none max-w-[85%] shadow-sm relative overflow-hidden">
                <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-gray-100">
                  <Image 
                    src="/landing/studio/hero-source-product.png"
                    alt="Product source"
                    fill
                    className="object-cover"
                  />
                  {phase === 2 && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
                      <div className="w-12 h-12 border-4 border-white/20 border-t-brand rounded-full animate-spin mb-4"></div>
                      <p className="text-white text-sm font-medium text-center">{getGenerationText()}</p>
                      <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-brand transition-all duration-75" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-[13px] text-gray-700 mt-2">Bu ürün için hareketli bir tanıtım videosu oluştur...</p>
             </div>
          </div>

          {/* Phase 3, 4, 5: Video & Messages */}
          <div className={`transition-opacity duration-300 ${phase >= 3 ? 'opacity-100' : 'opacity-0 hidden'} flex flex-col gap-3 w-full`}>
            {/* Outgoing video + message */}
            <div className="bg-[#d9fdd3] p-1.5 rounded-xl rounded-tr-none max-w-[85%] shadow-sm self-end">
               <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden bg-black mb-1 group">
                 <video 
                   src="/landing/studio/hero-flow-veo.mp4" 
                   poster="/landing/studio/hero-flow-veo-poster.jpg"
                   autoPlay 
                   muted 
                   loop 
                   playsInline
                   className="w-full h-full object-cover"
                 />
               </div>
               <div className="px-1.5 pb-1">
                 <p className="text-[14.5px] leading-snug text-gray-900 mb-1">Yeni koleksiyonumuz yayında ✨</p>
                 <div className="flex justify-end items-center gap-1">
                   <span className="text-[10px] text-gray-500">10:42</span>
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                     <path d="M4 12L9 17L20 6" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                     <path d="M4 17L9 22L20 11" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"/>
                   </svg>
                 </div>
               </div>
            </div>

            {/* Incoming reply (Phase 4+) */}
            <div className={`bg-white px-3 py-2 rounded-xl rounded-tl-none max-w-[85%] shadow-sm self-start transition-all duration-300 transform ${phase >= 4 ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
              <p className="text-[14.5px] leading-snug text-gray-900">Siyah modeli var mı? 🤔</p>
              <div className="flex justify-end">
                <span className="text-[10px] text-gray-500">10:43</span>
              </div>
            </div>
          </div>

          {/* Phase 5: Inbox Notification Overlay */}
          <div className={`absolute top-4 left-4 right-4 bg-white rounded-2xl shadow-xl p-3 flex items-start gap-3 transition-all duration-500 transform ${phase === 5 ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'}`}>
            <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-brand mb-0.5">Mesajify Inbox</p>
              <p className="text-sm font-medium text-gray-900 truncate">Yeni müşteri yanıtı</p>
              <p className="text-xs text-gray-500 truncate">"Siyah modeli var mı? 🤔"</p>
            </div>
          </div>

        </div>
        
        {/* Chat Input Area (static) */}
        <div className="bg-[#f0f2f5] px-2 py-3 flex items-center gap-2 z-10">
          <button className="p-2 text-gray-500"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg></button>
          <div className="flex-1 bg-white rounded-full h-10 px-4 flex items-center text-gray-400 text-[15px]">
            Mesaj yaz...
          </div>
          <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
          </div>
        </div>
        
        {/* Home indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1/3 h-1 bg-black/20 rounded-full z-20"></div>
      </div>
    </div>
  );
}
