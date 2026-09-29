import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent pointer-events-none" />

      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <img
            src="/logos/mesajify_app_icon_corporate_squircle.png"
            alt="Mesajify"
            className="w-8 h-8 rounded-lg shadow-sm"
          />
          <span className="font-bold text-lg tracking-tight text-white">Mesajify</span>
        </div>

        <nav className="flex items-center gap-4">
          <a
            href="https://app.mesajify.com/giris"
            className="text-sm font-medium text-zinc-300 hover:text-white transition-colors"
          >
            Giriş Yap
          </a>
          <a
            href="https://app.mesajify.com"
            className="text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            Panele Git
          </a>
        </nav>
      </header>

      {/* Hero Body */}
      <main className="max-w-4xl mx-auto my-auto text-center z-10 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-zinc-400 mb-6 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Mesajify Creative & Delivery Engine
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6">
          Kreatif Üretimden{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
            WhatsApp Gönderimine
          </span>
          <br />
          Uçtan Uca Bütünleşik Güç.
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Yapay zeka ile video ve görsel kampanyalar üretin, hatlarınızı güvenle bağlayın, listenize akıllı hız kısıtlamalarıyla toplu iletin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="https://app.mesajify.com"
            className="w-full sm:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl text-base transition-all shadow-lg shadow-blue-600/20"
          >
            Hemen Başlayın &rarr;
          </a>
          <a
            href="https://app.mesajify.com/giris"
            className="w-full sm:w-auto px-7 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 font-medium rounded-xl text-base transition-all"
          >
            Müşteri Girişi
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl w-full mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4 border-t border-white/5 pt-6 z-10">
        <p>© 2026 Mesajify. Tüm hakları saklıdır.</p>
        <div className="flex gap-6">
          <a href="https://app.mesajify.com/giris" className="hover:text-zinc-400 transition-colors">Panel</a>
          <a href="mailto:destek@mesajify.com" className="hover:text-zinc-400 transition-colors">İletişim</a>
        </div>
      </footer>
    </div>
  )
}
