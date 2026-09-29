'use client';
import { useEffect, useState, useRef } from 'react';

export function ContactValidation() {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setStage(1), 500);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (stage === 1) {
      let current = 0;
      const interval = setInterval(() => {
        current += 5;
        if (current >= 100) {
          current = 100;
          clearInterval(interval);
          setTimeout(() => setStage(2), 500);
        }
        setProgress(current);
      }, 50);
    }
  }, [stage]);

  return (
    <section className="py-24 bg-white" ref={ref}>
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 text-[#090B0A]">
              Göndermeden önce listenizi tanıyın.
            </h2>
            <p className="text-lg text-gray-500 mb-8">
              Kişi listenizi doğrudan yükleyin. Sistem, listenizdeki kişilerin durumunu kampanya öncesinde kontrol eder.
            </p>
            <div className="flex gap-4">
              <span className="px-3 py-1 rounded-full bg-[#F7F9F8] text-sm text-[#090B0A] border border-gray-100">Excel</span>
              <span className="px-3 py-1 rounded-full bg-[#F7F9F8] text-sm text-[#090B0A] border border-gray-100">CSV</span>
            </div>
          </div>
          
          <div className="bg-[#F7F9F8] rounded-[20px] p-8 border border-[rgba(10,20,15,0.08)]">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center font-bold text-xl">
                  X
                </div>
                <div>
                  <h3 className="font-medium text-[#090B0A]">musteriler.xlsx</h3>
                  <p className="text-sm text-gray-500">Örnek dosya yükleniyor...</p>
                </div>
              </div>

              {stage >= 1 && (
                <div className="mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-[#090B0A]">2.418 kişi bulundu</span>
                    <span className="text-gray-500">{progress}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#22c55e] transition-all duration-75"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {stage === 2 && (
                <div className="flex gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex-1 bg-green-50 border border-green-100 rounded-lg p-3">
                    <div className="text-green-600 font-medium mb-1">2.291 hazır ✓</div>
                  </div>
                  <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3">
                    <div className="text-amber-600 font-medium mb-1">127 kontrol edildi ⚠️</div>
                  </div>
                </div>
              )}

              <button className={`w-full py-3 rounded-[10px] font-medium transition-colors ${stage === 2 ? 'bg-[#22c55e] text-white hover:bg-green-600' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                Kampanyaya Ekle →
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
