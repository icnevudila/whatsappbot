import { PhoneSimulator } from './phone-simulator';

export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-80px)] pt-32 pb-20 flex items-center overflow-hidden">
      {/* Background soft accent */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-soft rounded-full blur-[120px] -z-10 translate-x-1/3 -translate-y-1/4 opacity-70"></div>

      <div className="max-w-[1240px] mx-auto px-6 w-full grid lg:grid-cols-[54fr_46fr] gap-12 lg:gap-8 items-center">
        <div className="max-w-2xl lg:max-w-none">
          <p
            className="font-jetbrains text-xs font-semibold tracking-widest text-ink-muted uppercase mb-6 animate-fade-in-up"
            style={{ animationDelay: '0ms' }}
          >
            WHATSAPP KAMPANYA PLATFORMU
          </p>
          
          <h1
            className="text-[42px] leading-[1.1] md:text-5xl lg:text-[64px] lg:leading-[1.05] font-[600] tracking-tight mb-4 animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            Reklamını oluştur.<br />
            WhatsApp'tan ulaştır.
          </h1>
          
          <p
            className="text-[42px] leading-[1.1] md:text-5xl lg:text-[64px] lg:leading-[1.05] font-[600] tracking-tight text-ink-muted mb-8 animate-fade-in-up"
            style={{ animationDelay: '200ms' }}
          >
            Yanıtları tek yerden yönet.
          </p>
          
          <p
            className="text-lg text-ink-muted mb-10 max-w-lg leading-relaxed animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            Ürün fotoğrafını veya kampanya fikrini yükle. Mesajify yapay zekasıyla 
            saniyeler içinde reklam videonu hazırlasın ve binlerce kişiye WhatsApp'tan 
            otomatik göndersin.
          </p>
          
          <div
            className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up"
            style={{ animationDelay: '400ms' }}
          >
            <a
              href="#"
              className="w-full sm:w-auto text-base font-medium bg-brand text-white px-8 py-4 rounded-[10px] hover:bg-brand-hover transition-colors shadow-sm text-center"
            >
              İlk Kampanyanı Oluştur &rarr;
            </a>
            <button
              className="w-full sm:w-auto text-base font-medium text-ink bg-surface px-8 py-4 rounded-[10px] hover:bg-hairline transition-colors text-center flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                <path d="M4 2.5v11l9-5.5-9-5.5z" />
              </svg>
              Nasıl Çalıştığını Gör
            </button>
          </div>
          
          <div
            className="mt-10 flex items-center gap-4 text-sm text-ink-muted animate-fade-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-canvas bg-surface flex items-center justify-center overflow-hidden">
                   <div className="w-full h-full bg-hairline-strong/50"></div>
                </div>
              ))}
            </div>
            <p>10,000+ işletme tarafından güveniliyor</p>
          </div>
        </div>

        <div
          className="relative lg:ml-auto w-full max-w-[320px] md:max-w-[360px] mx-auto lg:max-w-[400px] animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        >
          <PhoneSimulator />
        </div>
      </div>
    </section>
  );
}
