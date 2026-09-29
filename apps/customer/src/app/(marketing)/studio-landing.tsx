'use client'

/* eslint-disable @next/next/no-img-element -- curated local marketing assets */
import { useEffect, useRef, useState } from 'react'
import { useLocale } from '@/lib/i18n/provider'
import { contactMailto } from '@/lib/contact'
import './studio-landing.css'

const asset = '/landing/studio/'
type Media = { title: string; image: string; video?: string; note: string }

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={diagonal ? 'M6 18 18 6M6 6h12v12' : 'M4 12h15m-6-6 6 6-6 6'} /></svg>
}

function Film({ src, poster, label, enabled }: { src: string; poster: string; label: string; enabled: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(false)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => {
      if (visible && enabled && !preference.matches && !document.hidden) void video.play().catch(() => {})
      else video.pause()
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = Boolean(entry?.isIntersecting)
      if (visible) setNear(true)
      sync()
    }, { threshold: .15 })
    observer.observe(video)
    preference.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    video.addEventListener('loadeddata', sync)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      video.removeEventListener('loadeddata', sync)
      video.pause()
    }
  }, [enabled, near])
  return <video ref={ref} src={near ? src : undefined} poster={poster} muted loop playsInline preload="none" aria-label={label} />
}

function MediaDialog({ media, onClose, closeLabel }: { media: Media | null; onClose: () => void; closeLabel: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!media || !dialog) return
    const previous = document.activeElement as HTMLElement | null
    dialog.showModal()
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = before; previous?.focus() }
  }, [media])
  return <dialog className="ms-dialog" ref={ref} aria-labelledby="media-title" onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
    {media && <div className="ms-dialog-inner"><div className="ms-dialog-head"><h2 id="media-title">{media.title}</h2><button type="button" onClick={onClose} aria-label={closeLabel}>×</button></div>
      {media.video ? <video key={media.video} src={media.video} controls playsInline autoPlay aria-label={media.title} /> : <img src={media.image} alt={media.title} />}
      <p>{media.note}</p></div>}
  </dialog>
}

export function StudioLanding() {
  const { locale } = useLocale()
  const en = locale === 'en'
  const t = (tr: string, english: string) => en ? english : tr
  const [motion, setMotion] = useState(true)
  const [step, setStep] = useState(0)
  const [screen, setScreen] = useState(0)
  const [filter, setFilter] = useState('all')
  const [media, setMedia] = useState<Media | null>(null)
  const contact = contactMailto('Mesajify ürün demosu')
  const films: Media[] = [
    { title: t('İştah açan bir hikâye.', 'A story with flavor.'), image: asset + 'restaurant-poster.jpg', video: asset + 'restaurant.mp4', note: t('Mevcut demo arşivinden video örneği. Sessiz web önizlemesi.', 'Video from the existing demo archive. Silent web preview.') },
    { title: t('Ürün, başrolde.', 'The product takes the lead.'), image: asset + 'product-blue.webp', note: t('Bu landing için yapay zekâ ile üretilmiş temsili ürün görseli. Gerçek bir marka değildir.', 'Illustrative AI product image created for this landing. Not a real brand.') },
    { title: t('Kullanımını göster.', 'Show it in action.'), image: asset + 'product-poster.jpg', video: asset + 'product.mp4', note: t('Mevcut Flow/Veo demo arşivinden ham ürün videosu; yeni üretim değildir.', 'Raw product video from the existing Flow/Veo demo archive; not a new generation.') },
  ]
  const stages = [
    { name: t('Markanı tanıt', 'Define your brand'), tag: '01 / BRIEF', title: t('Her şey senin ürününle başlar.', 'It starts with your product.'), body: t('Ürün fotoğrafını, marka kimliğini ve kampanya hedefini bir araya getir. Yaratıcı çalışmanın referansı belli olsun.', 'Bring your product photo, brand identity and campaign goal together. Give the creative work a clear reference.'), chips: [t('Ürün referansı', 'Product reference'), t('Marka kimliği', 'Brand identity'), t('Kampanya hedefi', 'Campaign goal')] },
    { name: t('İçeriğini üret', 'Create your content'), tag: '02 / STUDIO', title: t('Bir fikir. Birden çok anlatım.', 'One idea. More ways to tell it.'), body: t('Görsel veya kısa video akışını seç. Sahneyi, metni ve marka kapanışını aynı kampanya etrafında hazırla.', 'Choose an image or short-video workflow. Shape the scene, copy and branded ending around one campaign.'), chips: [t('Görsel', 'Image'), t('Kısa video', 'Short video'), t('Marka kapanışı', 'Brand ending')] },
    { name: t('Onayla ve planla', 'Approve and plan'), tag: '03 / CAMPAIGN', title: t('Son söz her zaman sende.', 'You always have the final say.'), body: t('İçeriği kontrol et, izinli kişi grubunu seç ve kampanyanı planla. Üretim ile gönderim ayrı adımlar; otomatik onay varsayılmaz.', 'Review the creative, choose an opted-in audience and plan your campaign. Creation and delivery are separate steps.'), chips: [t('İçerik kontrolü', 'Creative review'), t('İzinli kişiler', 'Opted-in audience'), t('Planlı gönderim', 'Scheduled delivery')] },
    { name: t('Görüşmeyi sürdür', 'Keep talking'), tag: '04 / CONVERSATION', title: t('Kampanya biter. İletişim devam eder.', 'Campaigns end. Conversations continue.'), body: t('Yanıtları gelen kutusunda karşıla. Gönderim durumlarını ve kampanya raporlarını aynı çalışma alanından takip et.', 'Handle replies in the inbox. Follow delivery states and campaign reports from the same workspace.'), chips: [t('Gelen kutusu', 'Inbox'), t('Gönderim durumu', 'Delivery status'), t('Raporlar', 'Reports')] },
  ]
  const screens = [
    { name: t('Genel bakış', 'Overview'), src: '/landing/ozet.png', title: t('Günün tamamını tek yerden gör.', 'See the whole day in one place.'), detail: t('Hatlar, gönderimler ve günlük hareket aynı çalışma alanında.', 'Lines, deliveries and daily activity in one workspace.') },
    { name: t('Gelen kutusu', 'Inbox'), src: '/landing/gelenler.png', title: t('Yanıtlar arasında kaybolma.', 'Never lose the conversation.'), detail: t('Kampanya yanıtını ve görüşme geçmişini birlikte takip et.', 'Follow campaign replies alongside conversation history.') },
    { name: t('Raporlar', 'Reports'), src: '/landing/raporlar.png', title: t('Gönderildi mi? Takip et.', 'Sent? Follow the result.'), detail: t('Teslim, okunma ve başarısız gönderim durumlarını incele.', 'Inspect delivery, read and failed-message states.') },
  ]
  const current = stages[step]
  const selected = screens[screen]
  const faqs = [
    [t('Sadece WhatsApp gönderimi için mi?', 'Is it just for WhatsApp sending?'), t('Hayır. Mesajify; görsel ve kısa video hazırlama, marka varlıklarını düzenleme, kampanya planlama ve yanıtları takip etme araçlarını bir araya getirir. Kullanılabilir özellikler hesabınıza ve planınıza bağlıdır.', 'No. Mesajify brings together creative images and short videos, brand assets, campaign planning and replies. Available features depend on your account and plan.')],
    [t('Videolar otomatik olarak müşterilere gider mi?', 'Are videos sent to customers automatically?'), t('İçerik üretimi ve kampanya gönderimi ayrı işlemlerdir. Oluşturduğunuz içeriği inceleyip kampanyada kullanmayı siz seçersiniz.', 'Creative generation and campaign delivery are separate actions. You review the content and decide whether to use it in a campaign.')],
    [t('Sınırsız gönderim veya kesintisizlik garantisi var mı?', 'Is delivery unlimited or guaranteed?'), t('Hayır. Plan kotaları, hat limitleri ve sağlayıcı koşulları geçerlidir. Yalnız iletişim izni bulunan kişilere gönderim yapmalı; platform kurallarına uymalısınız.', 'No. Plan quotas, account limits and provider conditions apply. Contact only opted-in recipients and follow platform rules.')],
    [t('Sayfadaki ekran ve videolar nereden geliyor?', 'Where do the screenshots and videos come from?'), t('Videolar mevcut demo arşivinden, panel görüntüleri önceki demo ortamından alınmıştır; eski marka adı görünebilir. Mavi ürün görseli bu sayfa için yapay zekâ ile oluşturulmuştur. Bunlar müşteri sonucu veya başarı garantisi değildir.', 'Videos come from the existing demo archive and screenshots from an earlier demo environment; the previous brand name may appear. The blue product image was AI-generated for this page. These are not customer results or performance guarantees.')],
    [t('Nasıl başlayabilirim?', 'How do I get started?'), t('Demo talebiyle kullanım senaryonuzu paylaşın. Ekibimiz erişim, kullanılabilir planlar ve kurulum adımları hakkında bilgi verir. Mevcut kullanıcılar doğrudan giriş yapabilir.', 'Request a demo and share your use case. Our team will explain access, available plans and setup. Existing users can sign in directly.')],
  ]

  return <div className="ms-landing">
    <section className="ms-hero" aria-labelledby="studio-title">
      <div className="ms-hero-top"><span className="ms-eyebrow"><i /> MESAJIFY / CREATIVE MEETS CONVERSATION</span><button className="ms-motion" onClick={() => setMotion(v => !v)} aria-pressed={!motion}>{motion ? 'Ⅱ' : '▷'} {t(motion ? 'Hareketi durdur' : 'Hareketi aç', motion ? 'Pause motion' : 'Enable motion')}</button></div>
      <div className="ms-hero-grid"><div className="ms-hero-copy"><h1 id="studio-title">{t('Fikrin dikkat çeksin.', 'Make an impression.')}<br /><span>{t('Markan konuşulsun.', 'Start a conversation.')}</span></h1><p>{t('Görselini üret. Videonu hazırla. Kampanyanı yönet. Mesajify, yaratıcı fikrinle müşteri görüşmesi arasındaki işleri bir araya getirir.', 'Create the image. Make the video. Run the campaign. Mesajify connects your creative idea to the next customer conversation.')}</p><div className="ms-actions"><a href={contact} className="ms-button ms-primary">{t('Mesajify’ı keşfet', 'Discover Mesajify')}<Arrow /></a><a className="ms-text-link" href="#ornekler"><span className="ms-play-small">▷</span>{t('Neler üretebilirsin?', 'See what you can create')}</a></div><div className="ms-hero-foot"><span>01 — {t('ÜRET', 'CREATE')}</span><span>02 — {t('PLANLA', 'PLAN')}</span><span>03 — {t('İLETİŞİM KUR', 'CONNECT')}</span></div></div>
        <div className="ms-stage" aria-label={t('Kampanya örnekleri', 'Campaign examples')}>
          <button className="ms-scene ms-scene-back" onClick={() => setMedia(films[2])} aria-label={t('Ürün videosunu izle', 'Watch product video')}><img src={films[2].image} alt="" /><span>PRODUCT IN MOTION <Arrow diagonal /></span></button>
          <button className="ms-scene ms-scene-main" onClick={() => setMedia(films[1])} aria-label={t('Ürün görselini büyüt', 'Enlarge product image')}><img src={films[1].image} alt={t('Mavi cam parfüm şişesi, yapay zekâ ürün görseli', 'Blue glass perfume bottle, AI product image')} fetchPriority="high" /><span><b>THE NEXT<br />BIG IDEA.</b><small>AI CREATIVE / DEMO</small></span><em>↗</em></button>
          <button className="ms-scene ms-scene-front" onClick={() => setMedia(films[0])} aria-label={t('Restoran videosunu izle', 'Watch restaurant video')}><Film src={films[0].video!} poster={films[0].image} label={films[0].title} enabled={motion && !media} /><span><i>▷</i> {t('Hikâyeyi oynat', 'Play the story')}</span></button>
          <div className="ms-stage-tag"><span className="ms-dot" />{t('Bir kampanya. Birlikte çalışan katmanlar.', 'One campaign. Connected layers.')}</div>
        </div>
      </div>
      <div className="ms-capability-strip"><span>{t('FİKİRDEN İLETİŞİME', 'FROM IDEA TO CONVERSATION')}</span>{['AI Studio', t('Kısa video', 'Short video'), t('Marka kiti', 'Brand kit'), 'WhatsApp', t('Kampanya', 'Campaigns'), t('Gelen kutusu', 'Inbox')].map(s => <strong key={s}>{s}</strong>)}</div>
    </section>

    <section id="ornekler" className="ms-section ms-gallery"><div className="ms-section-heading"><div><span className="ms-eyebrow">01 / THE CREATIVE ROOM</span><h2>{t('Anlatma.', 'Don’t just explain.')}<br /><span>{t('Göster.', 'Show it.')}</span></h2></div><p>{t('Bir ürün fotoğrafından fazlası. Markana bir sahne, fikrine hareket, kampanyana bir başlangıç.', 'More than a product photo. A scene for your brand, motion for your idea, a starting point for your campaign.')}</p></div>
      <div className="ms-filter" role="group" aria-label={t('Örnek türü', 'Example type')}>{[['all',t('Tümü','All')],['video',t('Video','Video')],['image',t('Görsel','Image')]].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}<span>{t('Örnek çalışmalar / Ses kapalı', 'Demo works / Sound off')}</span></div>
      <div className="ms-media-grid">{films.filter(f => filter === 'all' || (filter === 'video' ? f.video : !f.video)).map((f,i) => <button className="ms-media-card" key={f.title} onClick={() => setMedia(f)}><div className="ms-media-poster"><img src={f.image} alt={f.title} loading="lazy" /><span className="ms-media-number">0{i+1}</span><span className="ms-open">{f.video ? '▷' : '↗'}</span><span className="ms-media-type">{f.video ? 'SHORT FILM' : 'AI PRODUCT VISUAL'}</span></div><div className="ms-media-caption"><h3>{f.title}</h3><Arrow diagonal /></div></button>)}</div>
    </section>

    <section id="nasil" className="ms-workflow ms-section"><div className="ms-section-heading"><div><span className="ms-eyebrow">02 / CONNECT THE DOTS</span><h2>{t('Dağınık işler.', 'Scattered tasks.')}<br /><span>{t('Tek bir akış.', 'One connected flow.')}</span></h2></div><p>{t('Üretim ayrı yerde, kampanya başka yerde, yanıtlar telefonda kalmasın. Adımlara dokun, bağlantıyı gör.', 'Creative in one tool, campaigns in another, replies on your phone? Select a step to explore the connection.')}</p></div>
      <div className="ms-flow-rail" role="group" aria-label={t('Kampanya adımları', 'Campaign steps')}>{stages.map((s,i) => <button key={s.tag} aria-pressed={step===i} aria-controls="flow-detail" onClick={() => setStep(i)}><span>{String(i+1).padStart(2,'0')}</span><b>{s.name}</b><Arrow /></button>)}</div>
      <div className="ms-flow-detail" id="flow-detail"><div className="ms-flow-visual" aria-hidden="true"><div className="ms-orbit ms-orbit-one" /><div className="ms-orbit ms-orbit-two" /><svg viewBox="0 0 640 380" className="ms-connections"><path d="M105 90Q320 90 320 190T535 290M105 290Q320 290 320 190T535 90" /><path className={motion ? 'ms-signal' : ''} d="M105 90Q320 90 320 190T535 290" /></svg><div className="ms-flow-center"><img src="/logos/mesajify_app_icon_corporate_squircle.png" alt="" /><span>mesajify</span></div>{['BRAND','CREATE','APPROVE','CONNECT'].map((s,i) => <div key={s} className={`ms-node ms-node-${i} ${step===i?'is-active':''}`}><span>{['◇','✦','✓','↗'][i]}</span><small>{s}</small></div>)}</div><div className="ms-flow-copy" aria-live="polite"><span className="ms-eyebrow">{current.tag}</span><h3>{current.title}</h3><p>{current.body}</p><div className="ms-chip-row">{current.chips.map(c => <span key={c}>{c}</span>)}</div><button className="ms-text-link" onClick={() => setStep((step+1)%4)}>{t('Sonraki adım', 'Next step')}<Arrow /></button></div></div>
    </section>

    <section id="urun" className="ms-product ms-section"><div className="ms-section-heading"><div><span className="ms-eyebrow">03 / INSIDE MESAJIFY</span><h2>{t('Sahne arkası da', 'Behind the scenes.')}<br /><span>{t('kontrol altında.', 'Still in control.')}</span></h2></div><p>{t('Yaratıcılık önde. Operasyon arka planda. Kampanyanın her adımını görünür tutan bir çalışma alanı.', 'Creativity up front. Operations behind it. A workspace that keeps every campaign step visible.')}</p></div>
      <div className="ms-product-tabs" role="group" aria-label={t('Panel ekranı', 'Product screen')}>{screens.map((s,i) => <button key={s.name} aria-pressed={screen===i} aria-controls="product-stage" onClick={() => setScreen(i)}>{s.name}</button>)}</div>
      <div className="ms-product-stage" id="product-stage"><div className="ms-window-bar"><span>● ● ●</span><span>MESAJIFY WORKSPACE</span><span>{t('Demo ortamı', 'Demo environment')}</span></div><button className="ms-screen-image" onClick={() => setMedia({title:selected.name,image:selected.src,note:t('Önceki demo ortamının ekran görüntüsü. Eski marka adı görünebilir.', 'Screenshot from an earlier demo environment. The former brand may appear.')})} aria-label={t('Ekran görüntüsünü büyüt', 'Enlarge screenshot')}><img src={selected.src} alt={selected.title} loading="lazy" /><span className="ms-screen-zoom">↗ {t('Yakından incele', 'Take a closer look')}</span></button></div><div className="ms-screen-info" aria-live="polite"><div><h3>{selected.title}</h3><p>{selected.detail}</p></div><small>{t('Arşiv demo ekranları · Eski marka adı görünebilir', 'Archived demo screens · Former brand may appear')}</small></div>
    </section>

    <section id="guvenlik" className="ms-control ms-section"><div className="ms-control-title"><span className="ms-eyebrow">04 / YOU ARE THE DIRECTOR</span><h2>{t('Otomasyon çalışsın.', 'Let automation work.')}<br />{t('Kontrol sende kalsın.', 'Keep the control.')}</h2><p>{t('İyi bir kampanya yalnızca güzel görünmez. Doğru kişilere, doğru ayarlarla ulaşır.', 'A good campaign doesn’t only look good. It reaches the right audience with the right settings.')}</p><a className="ms-text-link" href={contact}>{t('Kullanım senaryonu konuşalım', 'Let’s discuss your workflow')}<Arrow /></a></div><div className="ms-control-list">{[
        ['01',t('Önce kontrol, sonra gönderim','Review first, send second'),t('Üretilen dosya ile onaylanmış içerik aynı şey değildir. Son kararı sen verirsin.','A generated file is not the same as approved content. You make the final decision.')],
        ['02',t('Görünür limitler, gerçek beklentiler','Visible limits, honest expectations'),t('Hesap ve plan kotaları geçerlidir. Sınırsız gönderim veya kısıtlanmama sözü vermiyoruz.','Account and plan quotas apply. We do not promise unlimited sending or immunity from restrictions.')],
        ['03',t('Her yanıtın bir yeri var','Every reply has a place'),t('Kampanya sonrası görüşmeleri gelen kutusundan, gönderim durumlarını raporlardan takip et.','Follow post-campaign conversations in the inbox and delivery states in reports.')],
      ].map(([n,title,body]) => <article key={n}><span>{n}</span><div><h3>{title}</h3><p>{body}</p></div><i>↗</i></article>)}</div></section>

    <section id="sss" className="ms-faq ms-section"><div><span className="ms-eyebrow">A FEW THINGS TO KNOW</span><h2>{t('Aklındaki sorular.', 'A few questions.')}</h2><p>{t('Net cevaplar. Küçük yazıların arkasına saklanmadan.', 'Clear answers. Without hiding behind the fine print.')}</p></div><div>{faqs.map(([q,a]) => <details key={q}><summary>{q}<span>+</span></summary><p>{a}</p></details>)}</div></section>
    <section id="demo" className="ms-final"><div className="ms-final-orbit" aria-hidden="true" /><span className="ms-eyebrow">YOUR NEXT CAMPAIGN STARTS HERE</span><h2>{t('Sıradaki hikâye,', 'The next story')}<br />{t('senin markanın.', 'is your brand’s.')}</h2><p>{t('Birlikte ürününden kampanyana uzanan akışı kuralım.', 'Let’s connect your product to your next campaign.')}</p><a className="ms-button ms-white" href={contact}>{t('Demo talep et', 'Request a demo')}<Arrow /></a><small>{t('Erişim ekibimiz tarafından açılır. Mevcut hesabınla giriş yapabilirsin.', 'Access is set up by our team. Existing users can sign in.')}</small></section>
    <MediaDialog media={media} onClose={() => setMedia(null)} closeLabel={t('Kapat', 'Close')} />
  </div>
}
