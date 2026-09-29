import React from 'react';

export function DeliveryEngine() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-[600] text-[#090B0A] tracking-tight font-outfit mb-6">
            Kampanyanı tek hatta yükleme.
          </h2>
          <p className="text-gray-600 text-lg">
            Bağlı işletme hatlarını tek panelden yönet. Kampanya operasyonunu hatlar arasında kontrollü şekilde dağıt.
          </p>
        </div>

        <div className="relative max-w-3xl mx-auto h-[400px] md:h-[500px]">
          {/* Top Node */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-10">
            <div className="bg-[#07100C] text-white px-8 py-4 rounded-2xl shadow-xl flex flex-col items-center gap-2">
              <span className="text-sm font-medium text-gray-400 tracking-wider">KAMPANYA</span>
              <span className="font-semibold text-lg">10.000 Kişi</span>
            </div>
          </div>

          {/* Lines container */}
          <div className="absolute top-[72px] left-0 right-0 h-[200px] z-0">
            {/* Center line */}
            <div className="absolute top-0 left-1/2 w-px h-full bg-gray-200">
              <div className="w-2 h-2 rounded-full bg-[#22c55e] absolute left-1/2 -translate-x-1/2 animate-dot" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 rounded-full bg-[#22c55e] absolute left-1/2 -translate-x-1/2 animate-dot" style={{ animationDelay: '1s' }}></div>
            </div>
            
            {/* Left line */}
            <svg className="absolute top-0 left-0 w-1/2 h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path id="pathLeft" d="M 100,0 C 100,50 20,50 20,100" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              <circle r="2" fill="#22c55e">
                <animateMotion dur="2.5s" repeatCount="indefinite" path="M 100,0 C 100,50 20,50 20,100" />
              </circle>
            </svg>
            
            {/* Right line */}
            <svg className="absolute top-0 right-0 w-1/2 h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
              <path id="pathRight" d="M 0,0 C 0,50 80,50 80,100" fill="none" stroke="#e5e7eb" strokeWidth="1" />
              <circle r="2" fill="#22c55e">
                <animateMotion dur="2.2s" repeatCount="indefinite" path="M 0,0 C 0,50 80,50 80,100" />
              </circle>
            </svg>
          </div>

          {/* Bottom Nodes */}
          <div className="absolute top-[272px] left-0 w-full flex justify-between px-4 md:px-12 z-10">
            {/* Node 1 */}
            <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-xl p-4 shadow-lg w-[100px] md:w-[160px] flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="font-medium text-sm md:text-base">HAT 01</span>
              <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">Aktif</span>
            </div>

            {/* Node 2 */}
            <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-xl p-4 shadow-lg w-[100px] md:w-[160px] flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="font-medium text-sm md:text-base">HAT 02</span>
              <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">Dinleniyor</span>
            </div>

            {/* Node 3 */}
            <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-xl p-4 shadow-lg w-[100px] md:w-[160px] flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span className="font-medium text-sm md:text-base">HAT 03</span>
              <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">Hazır</span>
            </div>
          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes moveDot {
          0% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-dot {
          animation: moveDot 2s infinite linear;
        }
      `}} />
    </section>
  );
}
