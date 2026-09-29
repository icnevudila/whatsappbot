'use client';

import React, { useEffect, useRef, useState } from 'react';

const steps = [
  { label: 'AI Reklam Stüdyosu' },
  { label: 'Akıllı Kampanya' },
  { label: 'WhatsApp' },
  { label: 'Müşteri Yanıtı' },
  { label: 'Ortak Gelen Kutusu' }
];

export function TruthStrip() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setProgress(100);
          } else {
            setProgress(0);
          }
        });
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <section className="bg-[#F7F9F8] py-24 overflow-hidden" ref={containerRef}>
      <div className="max-w-[1240px] mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-[600] text-[#090B0A] text-center mb-16 tracking-tight font-outfit">
          Bir kampanya için gereken her şey. Tek yerde.
        </h2>
        
        <div className="relative overflow-x-auto pb-8 hide-scrollbar">
          <div className="min-w-[800px] relative">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 w-full h-[2px] bg-gray-200 -translate-y-1/2"></div>
            {/* Progress Line */}
            <div 
              className="absolute top-1/2 left-0 h-[2px] bg-[#22c55e] -translate-y-1/2 transition-all duration-[1500ms] ease-out"
              style={{ width: `${progress}%` }}
            ></div>
            
            <div className="relative flex justify-between items-center z-10">
              {steps.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-4 bg-[#F7F9F8] px-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors duration-500 ${progress > (i / (steps.length - 1)) * 100 - 10 ? 'border-[#22c55e] bg-green-50' : 'border-gray-200 bg-white'}`}>
                    <div className={`w-3 h-3 rounded-full transition-colors duration-500 ${progress > (i / (steps.length - 1)) * 100 - 10 ? 'bg-[#22c55e]' : 'bg-gray-300'}`}></div>
                  </div>
                  <span className="font-medium text-sm md:text-base text-[#090B0A]">{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </section>
  );
}
