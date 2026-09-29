import { PhoneSimulator } from '../hero/phone-simulator'

export function Scene01Hero() {
  return (
    <section className="scene relative min-h-screen flex items-center pt-28 pb-16 lg:pt-0 lg:pb-0">
      <div className="max-w-[1240px] mx-auto px-6 w-full grid lg:grid-cols-[1fr_420px] gap-16 lg:gap-12 items-center">
        {/* Copy — ultra low density */}
        <div>
          <p
            className="font-[family-name:var(--font-jetbrains)] text-[11px] font-medium tracking-[0.12em] uppercase text-ink-muted mb-8 animate-fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            WhatsApp Kampanya Platformu
          </p>

          <h1
            className="text-[clamp(44px,6vw,80px)] leading-[1.04] font-[600] tracking-tight mb-6 animate-fade-in-up"
            style={{ animationDelay: '120ms' }}
          >
            Reklamını oluştur.
            <br />
            WhatsApp'tan ulaştır.
          </h1>

          <p
            className="text-[clamp(28px,3.5vw,48px)] leading-[1.1] font-[500] tracking-tight text-ink-muted mb-10 animate-fade-in-up"
            style={{ animationDelay: '220ms' }}
          >
            Yanıtları tek yerden yönet.
          </p>

          <p
            className="text-lg text-ink-muted max-w-md leading-relaxed mb-12 animate-fade-in-up"
            style={{ animationDelay: '320ms' }}
          >
            Ürün fotoğrafını veya kampanya fikrini yükle. Mesajify reklam içeriğini
            hazırlar, kampanyanı yönetmene yardımcı olur ve müşteri yanıtlarını
            tek panelde toplar.
          </p>

          <div
            className="flex flex-col sm:flex-row items-start gap-4 animate-fade-in-up"
            style={{ animationDelay: '420ms' }}
          >
            <a
              href="#"
              className="text-base font-medium bg-brand text-white px-8 py-4 rounded-[10px] hover:bg-brand-hover transition-colors text-center"
            >
              İlk Kampanyanı Oluştur →
            </a>
            <button className="text-base font-medium text-ink-muted hover:text-ink transition-colors px-4 py-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full border border-hairline-strong flex items-center justify-center">
                <svg className="w-3 h-3 fill-current ml-0.5" viewBox="0 0 16 16">
                  <path d="M4 2.5v11l9-5.5-9-5.5z" />
                </svg>
              </span>
              Nasıl Çalıştığını Gör
            </button>
          </div>
        </div>

        {/* SIGNATURE MOMENT 01 — Phone simulator */}
        <div
          className="relative w-full max-w-[380px] mx-auto lg:mx-0 animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <PhoneSimulator />
        </div>
      </div>
    </section>
  )
}
