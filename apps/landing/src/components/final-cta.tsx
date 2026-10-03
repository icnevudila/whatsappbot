import Image from 'next/image';

export function FinalCta() {
  return (
    <section className="py-32 bg-[#07100C] text-white text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-t from-[#22c55e]/10 to-transparent" />
      <div className="max-w-[1240px] mx-auto px-6 relative z-10">
        <div className="w-16 h-16 mx-auto mb-8 opacity-75">
          <Image 
            src="/brand/mesajify-symbol.png"
            alt="Mesajify"
            width={64}
            height={64}
            className="object-contain"
          />
        </div>
        <h2 className="text-5xl md:text-7xl font-medium tracking-tight mb-8">
          Bir fotoğraftan<br />müşteri konuşmasına.
        </h2>
        <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
          Kampanyanızı Mesajify ile oluşturun, ulaştırın ve yönetin.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="px-8 py-4 bg-[#22c55e] text-white rounded-[10px] font-medium text-lg hover:bg-green-600 transition-colors">
            İlk Kampanyanı Oluştur →
          </button>
          <button className="px-8 py-4 bg-transparent border border-white/20 text-white rounded-[10px] font-medium text-lg hover:bg-white/5 transition-colors">
            Örnekleri İzle
          </button>
        </div>
        
        <p className="mt-16 text-sm text-gray-600 font-[family-name:var(--font-jetbrains)] tracking-widest uppercase">
          mesajify.com
        </p>
      </div>
    </section>
  );
}
