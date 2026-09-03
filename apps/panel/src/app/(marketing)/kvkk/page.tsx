import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/brand'

export const metadata: Metadata = { title: 'KVKK aydinlatma metni' }

export default function KvkkPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">
        KVKK aydinlatma metni
      </h1>
      <p className="mt-2 text-[12.5px] text-ink-faint">
        Son guncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="mt-8 flex flex-col gap-7 text-[13.5px] leading-relaxed text-ink-muted">
        <Section title="Islenen veriler">
          <p>
            {BRAND_NAME} uzerinde iki tur kisisel veri islenir. Birincisi hesap
            sahibine ait veriler: e-posta adresi, ad soyad ve firma bilgisi.
            Ikincisi, hesap sahibinin panele yukledigi alici verileri: telefon
            numaralari, varsa isimler ve gonderilen mesajlarin kaydi.
          </p>
          <p>
            WhatsApp hattinizi bagladiginizda olusan oturum anahtarlari sifreli
            olarak saklanir. Bu anahtarlar yalnizca sizin adiniza mesaj
            gonderebilmek icin kullanilir; sohbetleriniz okunmaz ve saklanmaz.
          </p>
        </Section>

        <Section title="Veri sorumlusu kim">
          <p>
            Panele yukledeginiz alici listeleri bakimindan{' '}
            <strong className="font-medium text-ink">veri sorumlusu sizsiniz</strong>,
            {' '}{BRAND_NAME} veri isleyen konumundadir. Yani bu numaralarin hangi
            hukuki sebeple islendigini, acik riza alinip alinmadigini ve saklama
            surelerini belirlemek size aittir.
          </p>
        </Section>

        <Section title="Ticari elektronik ileti izni">
          <p>
            6563 sayili kanun ve Ticari Iletisim Yonetmeligi geregi, alicilardan
            onceden onay alinmadan ticari elektronik ileti gonderilemez. Onaylarin
            alinmasi, kayit altina alinmasi ve Iletisim Yonetim Sistemi (IYS)
            yukumluluklerinin yerine getirilmesi hesap sahibinin sorumlulugundadir.
          </p>
          <p>
            Panelde bulunan kara liste ozelligi, cikma taleplerini isaretlemeniz
            icindir. Bu listeye eklenen numaralar hicbir kampanyaya dahil edilmez.
          </p>
        </Section>

        <Section title="Saklama ve silme">
          <p>
            Veriler hesabiniz aktif oldugu surece saklanir. Hesabinizi
            sildiginizde, bagli tum kisi listeleri, kampanya kayitlari ve oturum
            anahtarlari kalici olarak silinir. Tek tek liste silme islemi panelden
            yapilabilir.
          </p>
        </Section>

        <Section title="Haklariniz">
          <p>
            KVKK 11. madde kapsamindaki haklarinizi kullanmak icin bizimle
            iletisime gecebilirsiniz. Talepleriniz en gec otuz gun icinde
            sonuclandirilir.
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
