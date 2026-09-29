'use client'

import { useReveal } from '@/lib/use-reveal'

export function Scene07Bento() {
  const headRef = useReveal<HTMLDivElement>()

  return (
    <section className="scene bg-[#F7F9F8] scene-pad-lg border-t border-hairline">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Headline */}
        <div ref={headRef} className="reveal text-center max-w-2xl mx-auto mb-20">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted mb-6">
            MİMARİ & GÜVENLİK
          </p>
          <h2 className="text-[clamp(36px,5vw,72px)] leading-[1.06] font-[600] tracking-tight text-ink mb-6">
            Görünmeyen tarafta da güçlü.
          </h2>
          <p className="text-xl text-ink-muted leading-relaxed">
            Kampanyanızın başarısı sadece mesajın içeriğine değil, arka plandaki iletim kontrolüne bağlıdır.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          
          {/* Card 1: Akıllı Hat Yönetimi (Spans 7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 md:p-10 border border-hairline shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-6 border border-emerald-100">
                01
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">Akıllı Hat Yönetimi</h3>
              <p className="text-ink-muted leading-relaxed max-w-lg mb-8">
                Birden fazla bağlı hattı tek havuzda birleştirir. Gönderim paketleri hatlar arasında dengeli dağıtılarak hatların aşırı yüklenmesi engellenir.
              </p>
            </div>
            
            {/* Visual token */}
            <div className="p-4 rounded-2xl bg-surface border border-hairline flex items-center justify-between text-xs font-[family-name:var(--font-jetbrains)]">
              <span className="text-ink-muted">Hat Rotasyonu</span>
              <span className="text-brand font-medium">Dinamik Yük Dengeleme ✓</span>
            </div>
          </div>

          {/* Card 2: Liste Doğrulama (Spans 5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 md:p-10 border border-hairline shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-6 border border-blue-100">
                02
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">Liste Doğrulama</h3>
              <p className="text-ink-muted leading-relaxed mb-8">
                Hatalı, eksik veya mükerrer numaralar gönderim öncesinde taranarak temizlenir. Krediniz boşa gitmez.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-hairline flex items-center justify-between text-xs font-[family-name:var(--font-jetbrains)]">
              <span className="text-ink-muted">Ön Tarama</span>
              <span className="text-blue-600 font-medium">Otomatik Filtreleme ✓</span>
            </div>
          </div>

          {/* Card 3: Kampanya Görünürlüğü (Spans 5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-8 md:p-10 border border-hairline shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm mb-6 border border-purple-100">
                03
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">Gönderim Görünürlüğü</h3>
              <p className="text-ink-muted leading-relaxed mb-8">
                Hangi mesaj iletildi, hangisi okundu, hangi müşteri ne zaman yanıt verdi? Tüm akışı saniye saniye canlı izleyin.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-hairline flex items-center justify-between text-xs font-[family-name:var(--font-jetbrains)]">
              <span className="text-ink-muted">Canlı Durum</span>
              <span className="text-purple-600 font-medium">Çift Mavi Tik Takibi ✓</span>
            </div>
          </div>

          {/* Card 4: Opt-out & İzin Yönetimi (Spans 7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-8 md:p-10 border border-hairline shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm mb-6 border border-amber-100">
                04
              </div>
              <h3 className="text-2xl font-[600] text-ink mb-3">İzin & Kara Liste Yönetimi</h3>
              <p className="text-ink-muted leading-relaxed max-w-lg mb-8">
                İletişim almak istemeyen veya "İptal" yazan müşteriler otomatik olarak kara listeye eklenir. Gelecek kampanyalarda yanlışlıkla mesaj almazlar.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-hairline flex items-center justify-between text-xs font-[family-name:var(--font-jetbrains)]">
              <span className="text-ink-muted">Yasal Uyum</span>
              <span className="text-amber-600 font-medium">Otomatik Kara Liste Senkronu ✓</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
