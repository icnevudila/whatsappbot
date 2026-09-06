import type { Metadata } from 'next'
import { BRAND_NAME } from '@/components/brand'
import { LEGAL_CONTACT, legalEntityName } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Kullanım koşulları',
  description: `${BRAND_NAME} hizmet kullanım koşulları.`,
}

const UPDATED_AT = '6 Eylül 2026'

export default function TermsPage() {
  const operator = legalEntityName()

  return (
    <article className="mx-auto max-w-2xl px-5 py-16 filo-fade-in">
      <h1 className="text-[28px] font-semibold tracking-[-0.025em]">Kullanım koşulları</h1>
      <p className="mt-2 text-[12.5px] text-ink-faint">Son güncelleme: {UPDATED_AT}</p>

      <div className="mt-8 flex flex-col gap-7 text-[13.5px] leading-relaxed text-ink-muted">
        <Section title="Hizmet sağlayıcı">
          <p>
            Bu koşullar {BRAND_NAME} hizmetini sunan {operator} ile kullanıcı arasında geçerlidir.
            İletişim: {LEGAL_CONTACT.support}.
          </p>
        </Section>

        <Section title="Hizmetin kapsamı">
          <p>
            {BRAND_NAME}, kendi WhatsApp hesabınızı bir sunucuya bağlayarak toplu mesaj göndermenizi
            sağlayan bir araçtır. Hizmet, WhatsApp&apos;ın resmi Business API&apos;si üzerinden
            çalışmaz; mesajlar doğrudan sizin hattınızdan çıkar.
          </p>
        </Section>

        <Section title="Hesap riski">
          <p>
            WhatsApp, toplu gönderim yapan hesaplara geçici veya kalıcı kısıt uygulayabilir.{' '}
            {BRAND_NAME} bu riski azaltmak için numara doğrulama, ısındırma eğrisi, rastgele gönderim
            aralıkları ve otomatik durdurma uygular; ancak hiçbir hesabın kısıtlanmayacağı garanti
            edilemez. Hattınızın kısıtlanmasından doğan zararlardan {BRAND_NAME} sorumlu tutulamaz.
          </p>
        </Section>

        <Section title="Kabul edilmeyen kullanım">
          <p>
            İzinsiz elde edilmiş numara listelerine gönderim, yanıltıcı veya dolandırıcılık amaçlı
            içerik, nefret söylemi ve yasa dışı ürün tanıtımı yasaktır. Bu tür kullanımın tespiti
            halinde hesap bildirimsiz olarak kapatılır.
          </p>
        </Section>

        <Section title="Ödeme ve iptal">
          <p>
            Ücretsiz paket sınırlı kota ile sunulur. Ücretli paketler Stripe üzerinden aylık
            faturalanır; Ayarlar’daki müşteri portalından veya işletme silme sırasında abonelik
            iptal edilebilir. İptal durumunda dönem sonuna kadar hizmet devam edebilir. Ödeme
            altyapısı yapılandırılmamış ortamlarda yükseltme kapalıdır.
          </p>
        </Section>

        <Section title="Hizmetin sürekliliği">
          <p>
            Sunucu bakımı veya WhatsApp tarafındaki değişiklikler nedeniyle hizmette geçici
            kesintiler olabilir. Planlı bakımlar önceden duyurulur.
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
