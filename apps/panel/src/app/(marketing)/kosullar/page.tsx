import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/brand'

export const metadata: Metadata = { title: 'Kullanim kosullari' }

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">
        Kullanim kosullari
      </h1>
      <p className="mt-2 text-[12.5px] text-ink-faint">
        Son guncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="mt-8 flex flex-col gap-7 text-[13.5px] leading-relaxed text-ink-muted">
        <Section title="Hizmetin kapsami">
          <p>
            {BRAND_NAME}, kendi WhatsApp hesabinizi bir sunucuya baglayarak toplu
            mesaj gondermenizi saglayan bir aractir. Hizmet, WhatsApp&apos;in resmi
            Business API&apos;si uzerinden calismaz; mesajlar dogrudan sizin
            hattinizdan cikar.
          </p>
        </Section>

        <Section title="Hesap riski">
          <p>
            WhatsApp, toplu gonderim yapan hesaplara gecici veya kalici kisit
            uygulayabilir. {BRAND_NAME} bu riski azaltmak icin numara dogrulama,
            isindirma egrisi, rastgele gonderim araliklari ve otomatik durdurma
            uygular; ancak hicbir hesabin kisitlanmayacagi garanti edilemez.
            Hattinizin kisitlanmasindan dogan zararlardan {BRAND_NAME} sorumlu
            tutulamaz.
          </p>
        </Section>

        <Section title="Kabul edilmeyen kullanim">
          <p>
            Izinsiz elde edilmis numara listelerine gonderim, yaniltici veya
            dolandiricilik amacli icerik, nefret soylemi ve yasa disi urun
            tanitimi yasaktir. Bu tur kullanimin tespiti halinde hesap bildirimsiz
            olarak kapatilir.
          </p>
        </Section>

        <Section title="Odeme ve iptal">
          <p>
            Deneme surumu yedi gun sureyle ucretsizdir ve kredi karti gerektirmez;
            sure sonunda otomatik ucretlendirme yapilmaz. Ucretli paketler aylik
            olarak faturalanir ve istediginiz zaman iptal edilebilir. Iptal
            durumunda kalan sure sonuna kadar hizmet devam eder.
          </p>
        </Section>

        <Section title="Hizmetin surekliligi">
          <p>
            Sunucu bakimi veya WhatsApp tarafindaki degisiklikler nedeniyle
            hizmette gecici kesintiler olabilir. Planli bakimlar onceden duyurulur.
          </p>
        </Section>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-[15px] font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}
