import React from 'react';
import Image from 'next/image';

export function CreativeStudio() {
  return (
    <section className="bg-[#07100C] text-white py-24 rounded-[40px] mx-4 lg:mx-8 mb-24 overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-[600] tracking-tight font-outfit whitespace-pre-line mb-6">
            {'Bir fotoğraf.\nTam bir reklam filmi.'}
          </h2>
          <p className="text-gray-400 text-lg">
            Ürününüzü yükleyin. Mesajify sahneyi, videoyu, Türkçe seslendirmeyi ve altyazıyı hazırlamanıza yardımcı olsun.
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-20 h-auto md:h-[600px]">
          {/* Left Video */}
          <div className="relative w-full md:w-[280px] h-[500px] md:h-[500px] rounded-2xl overflow-hidden bg-gray-900 border border-white/10 shrink-0">
            <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              poster="/landing/studio/restaurant-poster.jpg"
              className="w-full h-full object-cover"
            >
              <source src="/landing/studio/restaurant.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Center Video (Larger) */}
          <div className="relative w-full md:w-[320px] h-[550px] md:h-[580px] rounded-2xl overflow-hidden bg-gray-900 border border-white/20 shadow-2xl shadow-[#22c55e]/10 shrink-0 z-10">
            <video 
              autoPlay 
              muted 
              loop 
              playsInline 
              poster="/landing/studio/product-poster.jpg"
              className="w-full h-full object-cover"
            >
              <source src="/landing/studio/product.mp4" type="video/mp4" />
            </video>
          </div>

          {/* Right Placeholder */}
          <div className="relative w-full md:w-[280px] h-[500px] md:h-[500px] rounded-2xl overflow-hidden bg-gray-900/50 border border-white/5 shrink-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/10 text-sm font-medium text-gray-300">Yakında</span>
            <p className="mt-4 text-sm text-gray-500">Daha fazla sektör şablonu çok yakında eklenecek.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-12 border-t border-white/10">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-semibold mb-2">100+</div>
            <div className="text-sm text-gray-400">Sektör</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-semibold mb-2">1.000</div>
            <div className="text-sm text-gray-400">Hazır senaryo</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-semibold mb-2">8–16 sn</div>
            <div className="text-sm text-gray-400">Reklam</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-semibold mb-2">9:16</div>
            <div className="text-sm text-gray-400">Dikey video</div>
          </div>
        </div>
      </div>
    </section>
  );
}
