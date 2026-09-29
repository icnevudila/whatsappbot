'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useReveal } from '@/lib/use-reveal'

const sectors = [
  {
    id: 'eticaret',
    label: 'E-Ticaret & Ürün',
    badge: 'Yeni Sezon Lansmanı',
    img: '/landing/studio/nova-headphones-ad.png',
    video: '/landing/studio/ecommerce-flow-veo.mp4',
    tag: 'E-Ticaret Kreatifi',
    title: 'NOVA Kablosuz Kulaklık',
    stats: 'Geri Dönüş: %14.2',
    msg: 'Yeni koleksiyonumuz yayında.\nÜrünleri keşfetmek ve lansmana özel %20 indirimden faydalanmak için bize yazabilirsiniz.',
    reply: 'Siyah modeli mevcut mu? Kargo ne zaman çıkar?',
    conversion: 'Anında Yanıtlandı · Sipariş Oluşturuldu (2.850 TL)',
  },
  {
    id: 'restoran',
    label: 'Restoran & Fırın',
    badge: 'Günlük Taze Menü',
    img: '/landing/studio/bakery-croissant-ad.png',
    video: '/landing/studio/restaurant-flow-veo.mp4',
    tag: 'Gastronomi & Fırın',
    title: 'Artisan Kruvasan & Kahve',
    stats: 'Rezervasyon: %28.4',
    msg: 'Bu sabah fırından yeni çıkan sıcak kruvasanlarımız ve artisan kahvelerimiz hazır.\nMenü ve rezervasyon için bize yazabilirsiniz.',
    reply: 'Öğlen 12:30 için 4 kişilik yeriniz var mı?',
    conversion: 'Masa #7 Rezerve Edildi · Konum İletildi',
  },
  {
    id: 'otomotiv',
    label: 'Otomotiv & Servis',
    badge: 'Test Sürüşü Daveti',
    img: '/landing/studio/automotive-ad.png',
    video: '/landing/studio/automotive-flow-veo.mp4',
    tag: 'Otomotiv Lansmanı',
    title: 'Yeni Nesil Elektrikli Seri',
    stats: 'Test Talebi: %19.1',
    msg: 'Yeni nesil araçlarımızı showroomumuzda deneyimleyin.\nModel detayları ve kişisel test sürüşü randevusu için bize yazabilirsiniz.',
    reply: 'Cumartesi günü test sürüşü için randevu alabilir miyim?',
    conversion: 'Test Sürüşü Onaylandı · Cumartesi 14:00',
  },
  {
    id: 'emlak',
    label: 'Emlak & Proje',
    badge: 'Ön Talep Portföyü',
    img: '/landing/studio/realestate-ad.png',
    video: '/landing/studio/realestate-flow-veo.mp4',
    tag: 'Lüks Konut Portföyü',
    title: 'Panoramik Rezidans Evleri',
    stats: 'Sunum Talebi: %11.8',
    msg: 'Şehrin en prestijli noktasında yeni projemiz satışa açıldı.\nKatalog ve özel ödeme planı detayları için bize yazabilirsiniz.',
    reply: '3+1 daire planlarını ve fiyat listesini gönderebilir misiniz?',
    conversion: 'Dijital Katalog İletildi · Sunum Randevusu Alındı',
  },
  {
    id: 'klinik',
    label: 'Klinik & Sağlık',
    badge: 'Kontrol & Randevu',
    img: '/landing/studio/clinic-ad.png',
    video: '/landing/studio/clinic-flow-veo.mp4',
    tag: 'Estetik & Sağlık',
    title: 'Periyodik Sağlık & Bakım',
    stats: 'Randevu Oranı: %34.0',
    msg: 'Sonbahar dönemi kontrol randevularımız açıldı.\nMuayene ve detaylı bilgi için bize yazabilirsiniz.',
    reply: 'Haftaya çarşamba öğleden sonra uygun bir saat var mı?',
    conversion: 'Randevu Oluşturuldu · Çarşamba 15:30',
  },
  {
    id: 'hizmet',
    label: 'Hizmet & Danışmanlık',
    badge: 'Strateji Toplantısı',
    img: '/landing/studio/service-ad.png',
    video: '/landing/studio/service-flow-veo.mp4',
    tag: 'Kurumsal Danışmanlık',
    title: 'B2B Büyüme & Operasyon',
    stats: 'Görüşme Oranı: %22.5',
    msg: 'Şirketiniz için 2026 büyüme ve dijital operasyon analizimiz hazır.\nDetaylı sunum ve değerlendirme toplantısı için bize yazabilirsiniz.',
    reply: 'Pazartesi 10:00 online toplantı için uygun musunuz?',
    conversion: 'Takvim Daveti Gönderildi · Görüşme Onaylandı',
  },
]

export function Scene03Sectors() {
  const [active, setActive] = useState(0)
  const headRef = useReveal<HTMLDivElement>()
  const data = sectors[active]

  return (
    <section className="scene bg-canvas scene-pad-lg border-t border-hairline">
      <div className="max-w-[1240px] mx-auto px-6">
        
        {/* Headline */}
        <div ref={headRef} className="reveal text-center max-w-3xl mx-auto mb-16">
          <p className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-brand font-semibold mb-6">
            HER SEKTÖRE ÖZEL KAMPANYA AKIŞI
          </p>
          <h2 className="text-[clamp(36px,5vw,72px)] leading-[1.06] font-[600] tracking-tight text-ink mb-6">
            İşletmeni seç.
            <br />
            Kampanyanı gör.
          </h2>
          <p className="text-xl text-ink-muted leading-relaxed">
            Mesajify arayüzünden oluşturulan reklam görseli, WhatsApp toplu gönderim akışı ve gelen müşteri yanıtının satışa dönüşü tek vitrinde.
          </p>
        </div>

        {/* Sector selection pills */}
        <div className="flex overflow-x-auto gap-2 justify-start lg:justify-center mb-16 pb-2 scrollbar-none">
          {sectors.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActive(i)}
              className={`px-6 py-3 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
                active === i
                  ? 'bg-ink text-white shadow-lg scale-105'
                  : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Two-Column Cinematic Showcase: Chat Flow (Left) + Visual Media (Right) */}
        <div className="grid lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          
          {/* Left Column: Realistic WhatsApp Dialogue & Conversion */}
          <div className="lg:col-span-7 bg-[#efeae2] rounded-3xl p-6 md:p-8 border border-hairline shadow-lg flex flex-col justify-between min-h-[480px]">
            
            {/* Header info */}
            <div className="flex items-center justify-between pb-4 border-b border-black/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-semibold text-ink flex items-center gap-1.5">
                    Mesajify İşletme Hattı
                    <span className="w-2 h-2 rounded-full bg-brand inline-block" />
                  </div>
                  <div className="text-xs text-ink-muted font-[family-name:var(--font-jetbrains)]">{data.badge}</div>
                </div>
              </div>
              <span className="text-xs font-[family-name:var(--font-jetbrains)] text-brand font-medium bg-white px-2.5 py-1 rounded-full border border-hairline shadow-xs">
                {data.stats}
              </span>
            </div>

            {/* Conversation Bubbles */}
            <div className="space-y-4 my-auto">
              
              {/* Outgoing campaign message */}
              <div className="flex justify-end">
                <div
                  key={`msg-${active}`}
                  className="bg-[#d9fdd3] rounded-2xl rounded-tr-sm px-5 py-3.5 max-w-[85%] shadow-sm animate-fade-in-up"
                >
                  <p className="text-[14.5px] leading-relaxed text-ink whitespace-pre-line">
                    {data.msg}
                  </p>
                  <div className="flex justify-end items-center gap-1 mt-2">
                    <span className="text-[10px] text-ink-faint">10:42</span>
                    <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                      <path d="M1 5.5L5 9.5L11 1.5" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 5.5L9 9.5L15 1.5" stroke="#53bdeb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Incoming customer reply */}
              <div className="flex justify-start">
                <div
                  key={`reply-${active}`}
                  className="bg-white rounded-2xl rounded-tl-sm px-5 py-3.5 max-w-[80%] shadow-sm border border-hairline animate-fade-in-up"
                  style={{ animationDelay: '150ms', animationFillMode: 'both' }}
                >
                  <p className="text-[14.5px] leading-relaxed text-ink font-medium">
                    {data.reply}
                  </p>
                  <div className="flex justify-end mt-1.5">
                    <span className="text-[10px] text-ink-faint">10:45</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Bottom Conversion Bar (Mesajify Real Panel Action) */}
            <div className="mt-6 pt-4 border-t border-black/10 flex items-center justify-between text-xs bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-hairline">
              <span className="text-emerald-700 font-medium font-[family-name:var(--font-jetbrains)]">{data.conversion}</span>
              <span className="text-[11px] text-ink-muted">Gelen Kutusu (Inbox)</span>
            </div>

          </div>

          {/* Right Column: Sector Campaign Visual Media with Mesajify Brand Overlay */}
          <div className="lg:col-span-5 relative w-full aspect-[9/14] rounded-3xl overflow-hidden bg-[#07100C] border border-hairline-strong shadow-xl group">
            
            {/* Sector Media: Bot-Generated Veo Video or Bot-Generated Visual */}
            {data.video ? (
              <video
                key={data.video}
                src={data.video}
                poster={data.img}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <Image
                src={data.img}
                alt={data.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
            )}

            {/* Bottom Gradient Information Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent flex flex-col justify-end p-6 z-10">
              <span className="text-xs font-semibold text-brand tracking-wider uppercase">
                {data.tag}
              </span>
              <h3 className="text-xl font-bold text-white mt-1">
                {data.title}
              </h3>
              <p className="text-xs text-white/70 mt-1.5 leading-relaxed">
                {data.video ? '9:16 Dikey Tanıtım Videosu · WhatsApp Toplu İletim' : 'AI Kampanya Görseli · WhatsApp Toplu İletim'}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  )
}
