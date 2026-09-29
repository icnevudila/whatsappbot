'use client';

import React, { useEffect, useRef, useState } from 'react';

const steps = [
  'ÜRÜN FOTOĞRAFI',
  'AI KREATİF',
  '9:16 VIDEO',
  'TÜRKÇE SES',
  'ALTYAZI',
  'MARKA',
  'WHATSAPP\'A HAZIR'
];

export function CreativeEngine() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      
      const scrollProgress = 1 - (rect.bottom - viewportHeight / 2) / rect.height;
      
      if (scrollProgress >= 0 && scrollProgress <= 1) {
        const index = Math.floor(scrollProgress * steps.length);
        setActiveIndex(Math.min(Math.max(index, 0), steps.length - 1));
      } else if (scrollProgress < 0) {
        setActiveIndex(-1);
      } else {
        setActiveIndex(steps.length - 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section className="bg-white py-32" ref={containerRef}>
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          <div className="lg:sticky lg:top-32 h-fit">
            <h2 className="text-3xl md:text-5xl font-[600] text-[#090B0A] tracking-tight font-outfit whitespace-pre-line mb-8">
              {'Sen ürünü ver.\nMesajify gerisini hazırlasın.'}
            </h2>
            <p className="text-gray-600 text-lg">
              Yapay zeka destekli stüdyomuz, sıradan ürün fotoğraflarını dakikalar içinde WhatsApp kampanyaları için optimize edilmiş dikkat çekici videolara dönüştürür.
            </p>
          </div>

          <div className="relative pl-8">
            <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gray-200"></div>
            
            <div className="flex flex-col gap-12">
              {steps.map((step, i) => {
                const isActive = i <= activeIndex;
                const isCurrent = i === activeIndex;
                
                return (
                  <div key={i} className="relative flex items-center gap-6">
                    <div className={`absolute -left-[37px] w-6 h-6 rounded-full border-2 flex items-center justify-center bg-white transition-all duration-300 ${isActive ? 'border-[#22c55e]' : 'border-gray-200'}`}>
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${isActive ? 'bg-[#22c55e]' : 'bg-transparent'}`}></div>
                    </div>
                    <div className={`font-jetbrains font-medium transition-all duration-300 ${isCurrent ? 'text-2xl md:text-3xl text-[#22c55e] scale-105 origin-left' : isActive ? 'text-xl text-[#090B0A]' : 'text-xl text-gray-400'}`}>
                      {step}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
