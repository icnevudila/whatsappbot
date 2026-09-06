/**
 * Landing ürün mock’ları — gerçek ekran görüntüsü yok.
 * Kampanya demo verisi; kişisel numara / sohbet yok.
 */

function ShellChrome({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[320px] bg-canvas text-ink sm:min-h-[380px]">
      <aside className="hidden w-[148px] shrink-0 flex-col border-r border-hairline bg-surface sm:flex">
        <div className="border-b border-hairline px-3 py-2.5">
          <p className="text-[13px] font-black tracking-[-0.03em]">Filo</p>
          <p className="mt-1 truncate text-[10px] text-ink-faint">Demo İşletme</p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 p-1.5 text-[11px] text-ink-muted">
          {['Özet', 'Hesaplar', 'Kampanyalar', 'Gelenler', 'Gidenler', 'Raporlar'].map((label) => (
            <span
              key={label}
              className={`rounded-[5px] px-2 py-1.5 ${
                label === title ? 'bg-accent-soft font-semibold text-accent-dim' : ''
              }`}
            >
              {label}
            </span>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-9 items-center justify-between border-b border-hairline bg-surface px-3">
          <p className="text-[11px] font-medium text-ink-soft">Demo İşletme</p>
          <p className="text-[10.5px] text-ink-faint">WhatsApp workbench</p>
        </header>
        <div className="p-3 sm:p-4">{children}</div>
      </div>
    </div>
  )
}

const INBOX = [
  {
    phone: '+90 532 ··· ·· 14',
    preview: 'İlgileniyorum, randevu alabilir miyim?',
    tag: 'yanıt',
    time: '09:42',
  },
  {
    phone: '+90 533 ··· ·· 28',
    preview: 'Fiyat listesini paylaşır mısınız?',
    tag: 'yanıt',
    time: '09:18',
  },
  {
    phone: '+90 544 ··· ·· 51',
    preview: 'Kampanyadan çıkmak istiyorum',
    tag: 'yeni',
    time: '08:55',
  },
] as const

const THREAD = [
  {
    out: true,
    text: 'Merhaba {{ad}}, bahar kampanyamızda kontrol + temizlik paketi %20 indirimli. Detay ister misiniz?',
  },
  { out: false, text: 'İlgileniyorum, randevu alabilir miyim?' },
  {
    out: true,
    text: 'Harika — uygun günleri Gelenler’den yanıtlayabilirsiniz. Çıkmak için “STOP” yazmanız yeterli.',
  },
] as const

export function MockInbox() {
  return (
    <ShellChrome title="Gelenler">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.02em]">Gelenler</h3>
          <p className="mt-0.5 text-[11px] text-ink-muted">Kampanya yanıtları · demo veri</p>
        </div>
        <span className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink">
          Kara liste
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[0.95fr_1.15fr]">
        <div className="overflow-hidden rounded-[10px] border border-hairline bg-surface">
          <div className="flex gap-1 border-b border-hairline p-2 text-[10.5px]">
            <span className="rounded bg-ink px-2 py-1 font-medium text-white">Tümü (3)</span>
            <span className="rounded px-2 py-1 text-ink-muted">Yanıtlar (2)</span>
            <span className="rounded px-2 py-1 text-ink-muted">Yeni (1)</span>
          </div>
          <ul className="divide-y divide-hairline">
            {INBOX.map((row, i) => (
              <li
                key={row.phone}
                className={`px-2.5 py-2.5 ${i === 0 ? 'border-l-2 border-l-accent bg-accent-soft/50' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[11.5px] font-medium">{row.phone}</p>
                  <span className="text-[10px] text-ink-faint">{row.time}</span>
                </div>
                <p className="mt-0.5 truncate text-[11px] text-ink-muted">{row.preview}</p>
                <span className="mt-1 inline-block text-[10px] font-medium text-accent">{row.tag}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex min-h-[220px] flex-col overflow-hidden rounded-[10px] border border-hairline bg-surface">
          <div className="border-b border-hairline px-3 py-2">
            <p className="font-mono text-[12px] font-semibold">+90 532 ··· ·· 14</p>
            <p className="text-[10.5px] text-ink-faint">Bahar kampanyası · yanıt</p>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-3">
            {THREAD.map((m, i) => (
              <div
                key={i}
                className={`max-w-[92%] rounded-xl px-3 py-2 text-[11.5px] leading-relaxed ${
                  m.out
                    ? 'ml-auto bg-accent text-accent-ink'
                    : 'bg-canvas-alt text-ink'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <div className="border-t border-hairline p-2">
            <div className="flex gap-2">
              <div className="h-8 flex-1 rounded-md border border-hairline bg-canvas px-2 text-[11px] leading-8 text-ink-faint">
                Mesajınızı yazın…
              </div>
              <span className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[11px] font-medium text-accent-ink">
                Yanıt gönder
              </span>
            </div>
          </div>
        </div>
      </div>
    </ShellChrome>
  )
}

const OUTBOX = [
  {
    phone: '+90 532 ··· ·· 14',
    body: 'Merhaba Ayşe, bahar kampanyamızda kontrol + temizlik %20 indirimli.',
    campaign: 'Bahar kampanyası',
    status: 'Okundu',
    tone: 'accent' as const,
    time: '09:40',
  },
  {
    phone: '+90 533 ··· ·· 28',
    body: 'Merhaba Mehmet, bu ay geçerli paket fırsatımızı paylaşmak istedik.',
    campaign: 'Bahar kampanyası',
    status: 'Okundu',
    tone: 'accent' as const,
    time: '09:41',
  },
  {
    phone: '+90 544 ··· ·· 51',
    body: 'Merhaba Zeynep, randevu hatırlatması: yarın 14:00.',
    campaign: 'Randevu hatırlatma',
    status: 'Teslim',
    tone: 'ok' as const,
    time: '08:12',
  },
  {
    phone: '+90 555 ··· ·· 03',
    body: 'Merhaba Deniz, listemize eklenen yeni fırsat için kısa bir not.',
    campaign: 'Hızlı gönderim',
    status: 'Okundu',
    tone: 'accent' as const,
    time: 'Dün',
  },
] as const

export function MockOutbox() {
  return (
    <ShellChrome title="Gidenler">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.02em]">Gidenler</h3>
          <p className="mt-0.5 text-[11px] text-ink-muted">Kampanya gönderimleri · demo veri</p>
        </div>
        <span className="text-[11px] text-ink-faint">4 kayıt · en yeni üstte</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1.05fr_0.95fr]">
        <div className="overflow-hidden rounded-[10px] border border-hairline bg-surface">
          <p className="border-b border-hairline px-3 py-2 text-[11px] font-medium text-ink-muted">
            Giden mesajlar
          </p>
          <ul className="divide-y divide-hairline">
            {OUTBOX.map((row, i) => (
              <li
                key={row.phone}
                className={`px-3 py-2.5 ${i === 0 ? 'border-l-2 border-l-accent bg-accent-soft/40' : ''}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-mono text-[11.5px] font-medium">{row.phone}</p>
                  <span className="text-[10px] text-ink-faint">{row.time}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-muted">{row.body}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-ink-faint">{row.campaign}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      row.tone === 'accent'
                        ? 'bg-accent-soft text-accent-dim'
                        : 'bg-ok-soft text-ok-dim'
                    }`}
                  >
                    {row.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[10px] border border-hairline bg-surface p-4">
          <p className="font-mono text-[12px] font-semibold">+90 532 ··· ·· 14</p>
          <p className="mt-1 text-[11px] text-ink-faint">Hat: Satış · salt okuma</p>
          <p className="mt-4 text-[12.5px] leading-relaxed text-ink">
            Merhaba Ayşe, bahar kampanyamızda kontrol + temizlik %20 indirimli. Detay için yanıt
            verebilirsiniz.
          </p>
          <p className="mt-3 text-[10.5px] text-ink-faint">09:40 · Bahar kampanyası · Okundu</p>
          <span className="mt-5 inline-flex h-8 items-center rounded-md bg-accent px-3 text-[11px] font-medium text-accent-ink">
            Gelenlerde aç
          </span>
        </div>
      </div>
    </ShellChrome>
  )
}

export function MockCampaigns() {
  return (
    <ShellChrome title="Kampanyalar">
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold tracking-[-0.02em]">Kampanyalar</h3>
          <p className="mt-0.5 text-[11px] text-ink-muted">Liste + hat seç, başlat · demo</p>
        </div>
        <span className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-ink">
          Yeni kampanya
        </span>
      </div>
      <div className="grid gap-2 lg:grid-cols-[1fr_280px]">
        <div className="overflow-hidden rounded-[10px] border border-hairline bg-surface">
          <div className="border-b border-hairline px-3 py-2 text-[11px] text-ink-muted">
            Geçmiş · 3 kampanya
          </div>
          {[
            { name: 'Bahar kampanyası', status: 'Tamamlandı', sent: 1840, fail: 12, pct: 98 },
            { name: 'Randevu hatırlatma', status: 'Çalışıyor', sent: 420, fail: 3, pct: 62 },
            { name: 'Yeni müşteri karşılama', status: 'Taslak', sent: 0, fail: 0, pct: 0 },
          ].map((c) => (
            <div key={c.name} className="border-b border-hairline px-3 py-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] font-semibold">{c.name}</p>
                <span className="text-[10.5px] font-medium text-accent">{c.status}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline">
                <div className="h-full rounded-full bg-accent" style={{ width: `${c.pct}%` }} />
              </div>
              <p className="mt-1.5 tabular text-[10.5px] text-ink-faint">
                {c.sent} giden · {c.fail} fail
              </p>
            </div>
          ))}
        </div>
        <div className="rounded-[10px] border border-hairline bg-surface p-3">
          <p className="text-[12px] font-semibold">Yeni kampanya</p>
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="rounded-md border border-hairline bg-canvas px-2 py-2 text-ink-muted">
              Liste: Bahar 2026 · İstanbul
            </div>
            <div className="rounded-md border border-hairline bg-canvas px-2 py-2 text-ink-muted">
              Hatlar: Satış + Destek
            </div>
            <div className="min-h-[72px] rounded-md border border-hairline bg-canvas px-2 py-2 text-ink-muted">
              Merhaba {'{{ad}}'}, bahar paketimizde…
            </div>
            <span className="inline-flex h-8 w-full items-center justify-center rounded-md bg-accent text-[11px] font-medium text-accent-ink">
              Kampanyayı başlat
            </span>
          </div>
        </div>
      </div>
    </ShellChrome>
  )
}

export function MockAccounts() {
  return (
    <ShellChrome title="Hesaplar">
      <div className="mb-3">
        <h3 className="text-[15px] font-semibold tracking-[-0.02em]">Hesaplar</h3>
        <p className="mt-0.5 text-[11px] text-ink-muted">Her satır ayrı WhatsApp hattı · demo</p>
      </div>
      <div className="mb-2 rounded-[10px] border border-hairline bg-surface px-3 py-2.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-muted">Hat kapasitesi</span>
          <span className="tabular font-semibold">3 / 40</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hairline">
          <div className="h-full w-[8%] rounded-full bg-accent" />
        </div>
      </div>
      <div className="space-y-2">
        {[
          {
            label: 'Satış hattı',
            phone: '+90 532 ··· ·· 01',
            status: 'Bağlı',
            ok: true,
            sent: 184,
            cap: 250,
          },
          {
            label: 'Destek hattı',
            phone: '+90 532 ··· ·· 02',
            status: 'Bağlı',
            ok: true,
            sent: 96,
            cap: 250,
          },
          {
            label: 'Kampanya yedek',
            phone: 'Numara bekleniyor',
            status: 'QR bekleniyor',
            ok: false,
            sent: 0,
            cap: 250,
          },
        ].map((a) => (
          <div key={a.label} className="rounded-[10px] border border-hairline bg-surface px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[12.5px] font-semibold">{a.label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-ink-faint">{a.phone}</p>
              </div>
              <span
                className={`text-[11px] font-medium ${a.ok ? 'text-ok' : 'text-warn'}`}
              >
                {a.status}
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
                <div
                  className={`h-full rounded-full ${a.sent > 0 ? 'bg-accent' : ''}`}
                  style={{ width: `${Math.round((a.sent / a.cap) * 100)}%` }}
                />
              </div>
              <span className="tabular text-[10.5px] text-ink-faint">
                {a.sent}/{a.cap}
              </span>
            </div>
          </div>
        ))}
      </div>
    </ShellChrome>
  )
}
