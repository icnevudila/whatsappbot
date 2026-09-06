import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/brand'

export const metadata: Metadata = {
  title: 'KVKK aydınlatma metni',
  description: `${BRAND_NAME} kişisel verilerin işlenmesi hakkında aydınlatma metni.`,
}

const UPDATED_AT = '6 Eylül 2026'
const CONTACT_EMAIL = 'kvkk@filo.app'
/** Yasal ünvan go-live’da güncellenir — docs/SELLABLE-GO-LIVE.md */
const CONTROLLER_PLACEHOLDER = 'Filo Platform İşletmecisi (ünvan güncellenecek)'

export default function KvkkPage() {
  return (
    <article className="mx-auto max-w-2xl px-5 py-16 filo-fade-in">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">KVKK aydınlatma metni</h1>
      <p className="mt-2 text-[12.5px] text-ink-faint">Son güncelleme: {UPDATED_AT}</p>

      <div className="mt-8 flex flex-col gap-7 text-[13.5px] leading-relaxed text-ink-muted">
        <Section title="Veri sorumlusu">
          <p>
            Platform işletmecisi bakımından veri sorumlusu:{' '}
            <strong className="font-medium text-ink">
              Veri sorumlusu: {CONTROLLER_PLACEHOLDER}
            </strong>
            . Başvurular için: {CONTACT_EMAIL}.
          </p>
          <p>
            Panele yüklediğiniz alıcı listeleri bakımından{' '}
            <strong className="font-medium text-ink">veri sorumlusu sizsiniz</strong>; {BRAND_NAME}{' '}
            bu veriler için veri işleyen konumundadır. Yani bu numaraların hangi hukuki sebeple
            işlendiğini, açık rıza alınıp alınmadığını ve saklama sürelerini belirlemek size aittir.
          </p>
        </Section>

        <Section title="İşlenen veriler">
          <p>
            {BRAND_NAME} üzerinde iki tür kişisel veri işlenir. Birincisi hesap sahibine ait
            veriler: e-posta adresi, ad soyad ve firma bilgisi. İkincisi, hesap sahibinin panele
            yüklediği alıcı verileri: telefon numaraları, varsa isimler ve gönderilen mesajların
            kaydı.
          </p>
          <p>
            WhatsApp hattınızı bağladığınızda oluşan oturum anahtarları şifreli olarak saklanır. Bu
            anahtarlar yalnızca sizin adınıza mesaj gönderebilmek için kullanılır; sohbetleriniz
            okunmaz ve saklanmaz.
          </p>
        </Section>

        <Section title="Ticari elektronik ileti izni">
          <p>
            6563 sayılı kanun ve Ticari İletişim Yönetmeliği gereği, alıcılardan önceden onay
            alınmadan ticari elektronik ileti gönderilemez. Onayların alınması, kayıt altına
            alınması ve İletişim Yönetim Sistemi (İYS) yükümlülüklerinin yerine getirilmesi hesap
            sahibinin sorumluluğundadır.
          </p>
          <p>
            Panelde bulunan kara liste özelliği, çıkma taleplerini işaretlemeniz içindir. Bu listeye
            eklenen numaralar hiçbir kampanyaya dahil edilmez.
          </p>
        </Section>

        <Section title="Saklama ve silme">
          <p>
            Veriler hesabınız ve bağlı işletmeniz aktif olduğu sürece saklanır. Panelden tek tek
            kişi listesi veya kampanya silebilirsiniz. İşletme veya hesabınız kapatıldığında bağlı
            kişi listeleri, kampanya kayıtları, mesaj logları ve WhatsApp oturum anahtarları kalıcı
            olarak silinir veya erişilemez hale getirilir.
          </p>
        </Section>

        <Section title="Haklarınız">
          <p>
            KVKK 11. madde kapsamındaki haklarınızı kullanmak için {CONTACT_EMAIL} adresine yazın.
            Talepleriniz en geç otuz gün içinde sonuçlandırılır.
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
