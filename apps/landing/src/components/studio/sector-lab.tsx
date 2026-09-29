'use client';

import React, { useState } from 'react';

const tabs = [
  { id: 'eticaret', label: 'E-Ticaret', msg: 'Yeni koleksiyonumuz yayında ✨ Ürünleri keşfetmek ve detay almak için bize yazabilirsiniz.', reply: 'Siyah modeli mevcut mu?' },
  { id: 'restoran', label: 'Restoran', msg: 'Bu akşam sofranız hazır 🍽️ Menü ve rezervasyon için bize yazabilirsiniz.', reply: '20:00 için 2 kişilik yeriniz var mı?' },
  { id: 'otomotiv', label: 'Otomotiv', msg: 'Yeni araçlarımızı keşfedin. Model ve detaylar için bize yazabilirsiniz.', reply: 'Bu model hakkında bilgi alabilir miyim?' },
  { id: 'emlak', label: 'Emlak', msg: 'Yeni portföyümüz yayında. Detaylar ve görüşme için bize yazabilirsiniz.', reply: 'Daireyi ne zaman görebilirim?' },
  { id: 'klinik', label: 'Klinik', msg: 'Kontrol randevularımız açıldı. Bilgi almak için bize yazabilirsiniz.', reply: 'En yakın boş tarih hangisi?' },
  { id: 'hizmet', label: 'Hizmet', msg: 'Bu hafta için randevu saatleri açıldı. Uygun saatleri öğrenmek için bize yazabilirsiniz.', reply: 'Cumartesi uygun musunuz?' },
];

export function SectorLab() {
  const [activeTab, setActiveTab] = useState(0);
  const activeData = tabs[activeTab];

  return (
    <section className="py-24 bg-[#F7F9F8]">
      <div className="max-w-[1240px] mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-[600] text-[#090B0A] text-center mb-12 tracking-tight font-outfit whitespace-pre-line">
          {'İşletmeni seç.\nKampanyanı gör.'}
        </h2>

        {/* Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 justify-start md:justify-center mb-12 pb-4">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(idx)}
              className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === idx ? 'bg-[#22c55e] text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-[rgba(10,20,15,0.08)]'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Chat UI */}
        <div className="max-w-md mx-auto bg-[#e5ddd5] rounded-3xl overflow-hidden shadow-xl border border-[rgba(10,20,15,0.08)] relative h-[400px]">
          {/* Header */}
          <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
              M
            </div>
            <div>
              <div className="font-medium">Mesajify Kampanya</div>
              <div className="text-xs text-white/80 transition-opacity duration-300">{activeData.label} Sektörü</div>
            </div>
          </div>

          {/* Chat Background */}
          <div className="absolute inset-0 bg-[#e5ddd5] z-0 opacity-50" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")' }}></div>

          {/* Messages */}
          <div className="relative z-10 p-4 flex flex-col gap-4 h-[calc(100%-64px)] overflow-y-auto">
            {/* Outgoing Message (Kampanya) */}
            <div key={`msg-${activeTab}`} className="self-end bg-[#dcf8c6] rounded-lg rounded-tr-none px-4 py-2 max-w-[85%] shadow-sm animate-fade-in-up">
              <p className="text-[#090B0A] text-sm leading-relaxed">{activeData.msg}</p>
              <div className="text-[10px] text-gray-500 text-right mt-1">10:42 ✓✓</div>
            </div>

            {/* Incoming Message (Müşteri) */}
            <div key={`reply-${activeTab}`} className="self-start bg-white rounded-lg rounded-tl-none px-4 py-2 max-w-[85%] shadow-sm animate-fade-in-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
              <p className="text-[#090B0A] text-sm leading-relaxed">{activeData.reply}</p>
              <div className="text-[10px] text-gray-500 text-right mt-1">10:45</div>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.05, 0.7, 0.1, 1);
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
}
