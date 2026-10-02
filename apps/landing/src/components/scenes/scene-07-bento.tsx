'use client'

import { Network, MessageSquare, BarChart3, ShieldCheck, CheckCircle2 } from 'lucide-react'

const BENTO_FEATURES = [
  {
    icon: Network,
    badge: 'Akıllı Yük Dengeleme',
    title: 'Çoklu Hat Akıllı Rota Yönetimi',
    description:
      'Tek bir numaraya yük bindirmek yerine, gönderimler bağlı tüm WhatsApp hatlarınız arasında zamana yayılarak akıllıca paylaştırılır. Kesintisiz ve güvenli iletişim sağlanır.',
    stats: 'Otomatik Hat Rotası',
  },
  {
    icon: MessageSquare,
    badge: 'Ortak Gelen Kutusu',
    title: 'Tüm Müşteri Yanıtları Tek Ekranda',
    description:
      'WhatsApp Web sekmeleri veya telefonlar arasında kaybolmayın. Farklı hatlardan gelen tüm sipariş ve fiyat soruları tek ekranda toplanır, ekibiniz anında yanıtlar.',
    stats: 'Hızlı Şablon & Satış',
  },
  {
    icon: BarChart3,
    badge: 'Canlı Takip',
    title: 'Gerçek Zamanlı İletim ve Raporlama',
    description:
      'Hangi mesajlar iletildi, kaç müşteri geri dönüş yaptı? Kampanya performansınızı net grafiklerle anlık olarak takip edin ve satış dönüşümünüzü ölçün.',
    stats: 'Şeffaf İstatistikler',
  },
  {
    icon: ShieldCheck,
    badge: 'Altyapı Güvencesi',
    title: 'Güvenli Gönderim ve İzin Protokolü',
    description:
      'Kontrollü gönderim hızları, otomatik mola aralıkları ve kara liste yönetimiyle WhatsApp iletişiminiz her zaman güvenli kurallar çerçevesinde ilerler.',
    stats: 'Otomatik Koruma',
  },
]

export function Scene07Bento() {
  return (
    <section className="relative w-full bg-[#f8faf8] py-20 sm:py-28 border-y border-emerald-950/10 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Mesajify Güçlü Altyapı
          </span>
          <h2 className="mt-5 text-[clamp(32px,4.5vw,56px)] font-bold tracking-tight text-slate-900 leading-[1.12]">
            Tanıtımınızın Arkasındaki <br />
            <span className="text-emerald-700">Akıllı ve Güvenli Araçlar.</span>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Karmaşık teknik terimler ve kafa karıştırıcı süreçler yok. Birden fazla WhatsApp hattını aynı anda yönetin, gelen siparişleri kaçırmayın ve tüm süreci şeffafça izleyin.
          </p>
        </div>

        {/* Clean Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {BENTO_FEATURES.map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="group relative rounded-3xl border border-slate-200/80 bg-white p-7 sm:p-9 shadow-lg shadow-slate-900/5 hover:border-emerald-400/80 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 group-hover:bg-emerald-600 group-hover:text-white transition-colors duration-300">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    {item.badge}
                  </span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-emerald-900 transition-colors">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  {item.description}
                </p>

                <div className="flex items-center gap-2 pt-4 border-t border-slate-100 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{item.stats}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
