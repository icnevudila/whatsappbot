import Image from 'next/image';

export function TrustSection() {
  return (
    <section className="py-24 bg-[#07100C] text-white overflow-hidden">
      <div className="max-w-[1240px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex flex-wrap gap-3 mb-8">
              {['Kontrollü', 'Görünür', 'Ölçülebilir', 'Yönetilebilir'].map((badge) => (
                <span key={badge} className="px-3 py-1 rounded-full bg-white/10 text-sm border border-white/10">
                  {badge}
                </span>
              ))}
            </div>
            <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">
              Kontrol sizde.
            </h2>
            <p className="text-lg text-gray-400 mb-12">
              Kampanyanızın her adımını tek panelden görün.
            </p>
            
            <ul className="space-y-6">
              {['Hat durumları', 'Gönderim raporları', 'Kara liste', 'Kampanya kontrolleri'].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-gray-300">
                  <div className="w-6 h-6 rounded-full bg-[#22c55e]/20 text-[#22c55e] flex items-center justify-center text-sm">
                    ✓
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#22c55e]/20 to-transparent blur-3xl -z-10 rounded-full" />
            <div className="rounded-xl border border-white/10 bg-[#0A1A12] shadow-2xl overflow-hidden">
              <div className="h-8 bg-black/40 border-b border-white/10 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-white/20" />
              </div>
              <Image 
                src="/landing/durum.png"
                alt="Mesajify Durum Ekranı"
                width={800}
                height={600}
                className="w-full h-auto opacity-90"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
