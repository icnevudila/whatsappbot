import Image from 'next/image';

export function InboxSection() {
  return (
    <section className="py-24 bg-[#F7F9F8]">
      <div className="max-w-[1240px] mx-auto px-6 text-center">
        <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6 text-[#090B0A]">
          Müşteri cevap verdiğinde<br />telefon aramayın.
        </h2>
        <p className="text-lg text-gray-500 mb-16 max-w-2xl mx-auto">
          Tüm bağlı hatlardan gelen konuşmaları tek gelen kutusunda yönetin.
        </p>
        
        <div className="relative mx-auto max-w-5xl rounded-xl border border-[rgba(10,20,15,0.08)] bg-white shadow-xl overflow-hidden">
          <div className="h-8 bg-gray-50 border-b border-gray-100 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          
          <div className="relative">
            <Image 
              src="/landing/gelenler.png" 
              alt="Mesajify Gelen Kutusu" 
              width={1200} 
              height={800} 
              className="w-full h-auto block"
            />
            
            <div className="absolute top-[30%] left-[15%] group">
              <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center font-bold text-sm shadow-lg relative z-10">01</div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full bg-[#22c55e] animate-ping opacity-75" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Konuşmalar</div>
            </div>
            
            <div className="absolute top-[40%] left-[50%] group">
              <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center font-bold text-sm shadow-lg relative z-10">02</div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full bg-[#22c55e] animate-ping opacity-75" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Müşteri bilgisi</div>
            </div>
            
            <div className="absolute top-[60%] left-[80%] group">
              <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center font-bold text-sm shadow-lg relative z-10">03</div>
              <div className="absolute top-0 left-0 w-full h-full rounded-full bg-[#22c55e] animate-ping opacity-75" />
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">Ekip yanıtı</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
