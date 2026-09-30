'use client'

import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

export function Scene07Bento() {
  const headRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene bg-[#F7F9F8] scene-pad-lg border-t border-hairline">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Headline */}
        <div ref={headRef} className="reveal text-center max-w-2xl mx-auto mb-12 sm:mb-20">
          <p className="text-xs font-semibold text-brand tracking-normal uppercase mb-4 sm:mb-6">
            Altyapı ve Güvenlik
          </p>
          <h2 className="text-[clamp(32px,5vw,72px)] leading-[1.06] font-[600] tracking-tight text-ink mb-4 sm:mb-6">
            Görünmeyen tarafta da güçlü.
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-ink-muted leading-relaxed">
            Kampanyanızın başarısı sadece mesajın içeriğine değil, arka plandaki iletim kontrolüne bağlıdır.
          </p>
        </div>

        {/* Bento Grid with REAL Mesajify App Screenshots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Card 1: Akıllı Hat Yönetimi (Spans 7 cols) with REAL Screenshot */}
          <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-6 border border-emerald-100">
                01
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">Akıllı Hat Yönetimi</h3>
              <p className="text-ink-muted leading-relaxed max-w-lg mb-6">
                Birden fazla bağlı hattı tek havuzda birleştirir. Gönderim paketleri hatlar arasında dengeli dağıtılarak hatların aşırı yüklenmesi engellenir.
              </p>
            </div>
            
            {/* Real Screenshot Preview */}
            <div className="relative w-full aspect-[21/9] bg-surface border-t border-hairline overflow-hidden">
              <Image
                src="/landing/hesaplar.png"
                alt="Mesajify Hat Yönetimi Paneli"
                fill
                className="object-cover object-top opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-40" />
            </div>
          </div>

          {/* Card 2: Liste Doğrulama (Spans 5 cols) with REAL Screenshot */}
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-6 border border-blue-100">
                02
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">Liste Doğrulama</h3>
              <p className="text-ink-muted leading-relaxed mb-6">
                Hatalı, eksik veya mükerrer numaralar gönderim öncesinde taranarak temizlenir. Krediniz boşa gitmez.
              </p>
            </div>

            {/* Real Screenshot Preview */}
            <div className="relative w-full aspect-[16/9] bg-surface border-t border-hairline overflow-hidden">
              <Image
                src="/landing/kisiler.png"
                alt="Mesajify Rehber Doğrulama"
                fill
                className="object-cover object-top opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-40" />
            </div>
          </div>

          {/* Card 3: Kampanya Görünürlüğü (Spans 5 cols) with REAL Screenshot */}
          <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm mb-6 border border-purple-100">
                03
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">Gönderim Görünürlüğü</h3>
              <p className="text-ink-muted leading-relaxed mb-6">
                Hangi mesaj iletildi, hangisi okundu, hangi müşteri ne zaman yanıt verdi? Tüm akışı saniye saniye canlı izleyin.
              </p>
            </div>

            {/* Real Screenshot Preview */}
            <div className="relative w-full aspect-[16/9] bg-surface border-t border-hairline overflow-hidden">
              <Image
                src="/landing/raporlar.png"
                alt="Mesajify Canlı Gönderim Raporları"
                fill
                className="object-cover object-top opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-40" />
            </div>
          </div>

          {/* Card 4: Opt-out & Kara Liste (Spans 7 cols) with REAL Screenshot */}
          <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl border border-hairline shadow-sm overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
            <div className="p-6 sm:p-8 md:p-10">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm mb-6 border border-amber-100">
                04
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">İzin & Kara Liste Yönetimi</h3>
              <p className="text-ink-muted leading-relaxed max-w-lg mb-6">
                İletişim almak istemeyen veya "İptal" yazan müşteriler otomatik olarak kara listeye eklenir. Gelecek kampanyalarda yanlışlıkla mesaj almazlar.
              </p>
            </div>

            {/* Real Screenshot Preview */}
            <div className="relative w-full aspect-[21/9] bg-surface border-t border-hairline overflow-hidden">
              <Image
                src="/landing/kara-liste.png"
                alt="Mesajify Kara Liste Yönetimi"
                fill
                className="object-cover object-top opacity-90 group-hover:scale-[1.02] transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent opacity-40" />
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
