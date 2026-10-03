import React from 'react';

export function BeforeAfter() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        <h2 className="text-3xl md:text-5xl font-[600] text-[#090B0A] text-center mb-20 tracking-tight font-outfit whitespace-pre-line">
          {'5 farklı araç değil.\nTek kampanya sistemi.'}
        </h2>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24">
          {/* Before */}
          <div className="bg-[#F7F9F8] rounded-[20px] p-8 md:p-12 relative border border-[rgba(10,20,15,0.08)] min-h-[400px] flex items-center justify-center">
            <h3 className="absolute top-8 left-8 text-xl font-medium text-gray-500">Mesajify'dan önce</h3>
            
            <div className="relative w-full h-full max-w-[400px] mx-auto min-h-[250px]">
              <div className="absolute top-[10%] left-[10%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[-5deg]">Tasarım aracı</div>
              <div className="absolute top-[20%] right-[5%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[8deg]">Ajans</div>
              <div className="absolute top-[45%] left-[5%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[3deg]">Video editörü</div>
              <div className="absolute top-[40%] right-[15%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[-12deg]">Excel</div>
              <div className="absolute bottom-[25%] left-[20%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[15deg]">Telefon</div>
              <div className="absolute bottom-[20%] right-[10%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[-6deg]">WhatsApp Web</div>
              <div className="absolute bottom-[5%] left-[30%] bg-white p-3 rounded-xl shadow-sm text-sm text-gray-500 border border-gray-100 rotate-[2deg]">Ekip telefonları</div>
              
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
                <path d="M 50,50 Q 200,100 150,200 T 300,150 T 250,300" fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="5,5" />
                <path d="M 150,200 Q 100,300 250,300" fill="none" stroke="#6b7280" strokeWidth="2" strokeDasharray="5,5" />
              </svg>
            </div>
          </div>

          {/* After */}
          <div className="bg-white rounded-[20px] p-8 md:p-12 relative border border-[rgba(10,20,15,0.08)] min-h-[400px] flex flex-col items-center justify-center shadow-lg shadow-green-900/5">
            <h3 className="absolute top-8 left-8 text-xl font-medium text-[#22c55e]">Mesajify ile</h3>
            
            <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center">
              {/* Center Logo */}
              <div className="w-20 h-20 bg-[#07100C] rounded-2xl flex items-center justify-center z-10 shadow-xl relative p-3">
                <img src="/brand/mesajify-symbol.png" alt="Mesajify" className="w-full h-full object-contain" />
              </div>

              {/* Connecting Lines */}
              <div className="absolute inset-0 z-0">
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-[#22c55e] -translate-y-1/2"></div>
                <div className="absolute left-1/2 top-4 bottom-4 w-0.5 bg-[#22c55e] -translate-x-1/2"></div>
              </div>

              {/* Nodes */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-[#F7F9F8] px-4 py-2 rounded-lg border border-[rgba(10,20,15,0.08)] text-sm font-medium z-10">İçerik</div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-[#F7F9F8] px-4 py-2 rounded-lg border border-[rgba(10,20,15,0.08)] text-sm font-medium z-10">Kampanya</div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 bg-[#F7F9F8] px-4 py-2 rounded-lg border border-[rgba(10,20,15,0.08)] text-sm font-medium z-10">Kişiler</div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#F7F9F8] px-4 py-2 rounded-lg border border-[rgba(10,20,15,0.08)] text-sm font-medium z-10">Yanıtlar</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
