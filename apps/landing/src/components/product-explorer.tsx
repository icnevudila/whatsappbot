'use client';
import { useState } from 'react';
import Image from 'next/image';

const TABS = [
  { id: 'hizli', label: 'Hızlı Gönderim', img: '/landing/hizli-gonderim.png', text: 'Kampanyanızı birkaç adımda hazırlayın.' },
  { id: 'kampanyalar', label: 'Kampanyalar', img: '/landing/ozet.png', text: 'Aktif ve tamamlanan kampanyaları tek ekrandan izleyin.' },
  { id: 'kisiler', label: 'Kişiler', img: '/landing/kisiler.png', text: 'Müşteri listenizi düzenleyin ve yönetin.' },
  { id: 'hat', label: 'Hat Yönetimi', img: '/landing/hesaplar.png', text: 'Bağlı işletme hatlarınızın durumunu görün.' },
  { id: 'raporlar', label: 'Raporlar', img: '/landing/raporlar.png', text: 'Gönderim sürecini tek ekrandan takip edin.' },
];

export function ProductExplorer() {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <section className="py-24 bg-white">
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 text-[#090B0A]">
          Demo değil.<br />Gerçek ürün.
        </h2>
        <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
          Mesajify'da kampanyanızı yönettiğiniz gerçek ekranları keşfedin.
        </p>

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-colors ${
                activeTab.id === tab.id 
                  ? 'bg-[#22c55e] text-white' 
                  : 'bg-[#F7F9F8] text-[#090B0A] hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative mx-auto max-w-5xl rounded-xl border border-[rgba(10,20,15,0.08)] bg-white shadow-xl overflow-hidden transition-all duration-500">
          <div className="h-8 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="relative w-full aspect-[16/10] bg-gray-50">
            {TABS.map((tab) => (
              <div 
                key={tab.id}
                className={`absolute inset-0 transition-all duration-600 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  activeTab.id === tab.id ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-95 z-0'
                }`}
              >
                <Image 
                  src={tab.img} 
                  alt={tab.label} 
                  fill 
                  className="object-cover object-top"
                />
              </div>
            ))}
          </div>
          <div className="bg-white p-6 border-t border-gray-100 text-left">
            <p className="text-lg text-[#090B0A] font-medium">{activeTab.text}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
