export function BentoGrid() {
  return (
    <section className="py-24 bg-[#F7F9F8]">
      <div className="max-w-[1240px] mx-auto px-6">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-16 text-center text-[#090B0A]">
          Görünmeyen tarafta da güçlü.
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-[20px] p-8 lg:col-span-2 relative overflow-hidden group">
            <div className="max-w-md relative z-10">
              <h3 className="text-2xl font-medium text-[#090B0A] mb-4">Akıllı Hat Yönetimi</h3>
              <p className="text-gray-500">Bağlı işletme hatlarını tek merkezden yönetin.</p>
            </div>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 h-48 opacity-20 group-hover:opacity-100 transition-opacity duration-500 hidden md:block">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#22c55e] rounded-full" />
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                <path d="M 50 50 L 90 20" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
                <path d="M 50 50 L 90 50" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
                <path d="M 50 50 L 90 80" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 4" className="animate-[dash_1s_linear_infinite]" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-[20px] p-8 relative overflow-hidden group">
            <h3 className="text-2xl font-medium text-[#090B0A] mb-4">Liste Doğrulama</h3>
            <p className="text-gray-500 mb-8">Gönderim öncesinde kişi listenizi kontrol edin.</p>
            <div className="w-16 h-16 bg-[#F7F9F8] rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">
              📊 ✓
            </div>
          </div>

          <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-[20px] p-8 relative overflow-hidden group">
            <h3 className="text-2xl font-medium text-[#090B0A] mb-4">Kampanya Kontrolü</h3>
            <p className="text-gray-500 mb-8">Gönderim durumlarını tek ekrandan izleyin.</p>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#22c55e] animate-pulse" />
              <div className="w-3 h-3 rounded-full bg-amber-400 animate-pulse delay-75" />
              <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse delay-150" />
            </div>
          </div>

          <div className="bg-white border border-[rgba(10,20,15,0.08)] rounded-[20px] p-8 lg:col-span-2 relative overflow-hidden group">
            <div className="max-w-md relative z-10">
              <h3 className="text-2xl font-medium text-[#090B0A] mb-4">Opt-out Yönetimi</h3>
              <p className="text-gray-500 mb-8">İletişim almak istemeyen kişileri sonraki kampanyalardan hariç tutun.</p>
            </div>
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-16 h-16 bg-red-50 rounded-xl flex items-center justify-center text-red-500 text-2xl group-hover:-translate-x-4 transition-transform duration-500 hidden md:flex">
              👤 ×
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
