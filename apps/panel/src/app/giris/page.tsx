import { AuthForm } from './auth-form'

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-[340px]">
        <div className="mb-7">
          {/* Yesil yalnizca isaret noktasinda: marka aksani, zemin degil. */}
          <div className="mb-4 flex items-center gap-2">
            <span className="size-2 rounded-full bg-accent" />
            <span className="text-[12px] font-medium tracking-wide text-ink-muted uppercase">
              Toplu Gonderim
            </span>
          </div>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
            WhatsApp kampanya paneli
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            Coklu hesap baglayin, kisi listelerinizi dogrulayin, kampanyayi sunucu
            tarafinda 7/24 calistirin.
          </p>
        </div>

        <div className="rounded-[10px] border border-hairline bg-surface p-4">
          <AuthForm />
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
          Gonderim yalnizca WhatsApp&apos;ta kayitli numaralara yapilir ve hesap basina
          gunluk kota uygulanir. Bu sinirlar hesabinizin kisitlanmasini onlemek icindir.
        </p>
      </div>
    </main>
  )
}
