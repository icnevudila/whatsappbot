import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/components/brand'
import { LEGAL_CONTACT, legalEntityName } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'KVKK Aydınlatma Metni ve Gizlilik Politikası',
  description: `${BRAND_NAME} kişisel verilerin korunması, işlenmesi ve ilgili kişi hakları hakkında aydınlatma metni.`,
}

const UPDATED_AT = '7 Kasım 2026'

export default function KvkkPage() {
  const controller = legalEntityName()

  return (
    <article className="mx-auto max-w-3xl px-5 py-14 filo-fade-in text-ink">
      <div className="mb-8">
        <Link
          href="/giris"
          className="text-[13px] text-ink-muted hover:text-brand transition-colors inline-flex items-center gap-1.5 mb-3"
        >
          ← Panele dön
        </Link>
        <span className="block text-[11px] font-bold tracking-wider uppercase text-brand mb-1">
          Yasal Uyum ve Aydınlatma
        </span>
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.03em] text-ink">
          KVKK Aydınlatma Metni ve Gizlilik Politikası
        </h1>
        <div className="mt-3 flex items-center gap-3 text-[12.5px] text-ink-muted">
          <span>Son güncelleme: <strong className="font-medium text-ink">{UPDATED_AT}</strong></span>
          <span>•</span>
          <span>Veri Sorumlusu: <strong className="font-medium text-ink">{controller}</strong></span>
        </div>
      </div>

      <div className="flex flex-col gap-8 text-[14px] leading-relaxed text-ink-muted">
        <Section title="1. Veri Sorumlusu ve Kapsam">
          <p>
            Bu Aydınlatma Metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu (“KVKK”) Madde 10 uyarınca
            aydınlatma yükümlülüğünün yerine getirilmesi amacıyla, veri sorumlusu sıfatıyla{' '}
            <strong className="text-ink font-medium">{controller}</strong> (“{BRAND_NAME}” veya “Platform”)
            tarafından hazırlanmıştır.
          </p>
          <p>
            İşbu metin; {BRAND_NAME} müşteri paneline kaydolan, WhatsApp hattını sisteme entegre eden, alıcı
            listeleriyle toplu ve planlı kampanya yürüten, gelen mesajları karşılayan tüm kullanıcıların ve
            temsilcilerin kişisel veri işleme süreçlerini kapsar.
          </p>
          <p>
            Resmî iletişim ve KVKK başvuru kanalı:{' '}
            <a href={`mailto:${LEGAL_CONTACT.kvkk}`} className="text-brand font-medium hover:underline">
              {LEGAL_CONTACT.kvkk}
            </a>
          </p>
        </Section>

        <Section title="2. Veri Sorumlusu ve Veri İşleyen Ayrımı (Kritik)">
          <div className="rounded-lg bg-emerald-50/60 border-l-4 border-emerald-600 p-4 text-[13.5px] text-emerald-950">
            <strong>Yasal Ayrım:</strong> {BRAND_NAME}, kullanıcıların kendi hesap bilgileri yönünden <em>Veri Sorumlusu</em>,
            panele yüklenen alıcı kişi listeleri ve iletilen mesaj içerikleri yönünden ise <em>Veri İşleyen (Data Processor)</em> konumundadır.
          </div>
          <p>
            Panele yüklediğiniz alıcı telefon numaraları, isimler ve kampanya mesaj metinleri bakımından{' '}
            <strong className="text-ink font-medium">veri sorumlusu sizsiniz</strong>. Bu numaraların hangi
            hukuki sebeple elde edildiğini, açık rızaların alınıp alınmadığını, 6563 sayılı ETK kapsamında ticari
            elektronik ileti izinlerinin varlığını ve İYS (İleti Yönetim Sistemi) uyumunu sağlamak tamamen hesap
            sahibinin yasal sorumluluğundadır.
          </p>
        </Section>

        <Section title="3. İşlenen Kişisel Veri Kategorileri">
          <p>Platform üzerinde aşağıdaki veri kategorileri işlenmektedir:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong className="text-ink font-medium">Hesap ve Kimlik Bilgileri:</strong> Ad-soyad, e-posta adresi,
              şirket unvanı, telefon numarası ve tek yönlü kriptografik hash ile saklanan parola.
            </li>
            <li>
              <strong className="text-ink font-medium">WhatsApp Oturum Verileri:</strong> Sisteme QR kodla bağladığınız
              WhatsApp hattının şifreli oturum anahtarları ve bağlantı logları (yalnızca mesaj iletimi için kullanılır).
            </li>
            <li>
              <strong className="text-ink font-medium">Alıcı ve Kampanya Verileri:</strong> Panele yüklenen telefon
              numaraları, alıcı grupları, kampanya metinleri, gönderim tarihi/saati ve iletim durum raporları.
            </li>
            <li>
              <strong className="text-ink font-medium">Gelen Kutusu Mesajlaşma Kayıtları:</strong> Müşterilerinizden gelen
              yanıtlar, giden cevaplar ve yapay zeka tarafından oluşturulan yanıt taslakları.
            </li>
            <li>
              <strong className="text-ink font-medium">Teknik Güvenlik Kayıtları:</strong> 5651 sayılı Kanun gereği
              tutulan IP adresleri, port, tarayıcı bilgisi, oturum tokenları ve sistem işlem logları.
            </li>
          </ul>
          <p>
            {BRAND_NAME} sistemlerine özel nitelikli kişisel veri (sağlık, din, siyasi görüş vb.) yüklenmemelidir.
          </p>
        </Section>

        <Section title="4. Hukuki İşleme Sebepleri">
          <p>Verileriniz, KVKK’nın 5. maddesinde yer alan aşağıdaki sebeplere dayanılarak işlenir:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>KVKK m. 5/2-c (Sözleşmenin İfası):</strong> Kullanıcı kaydı, WhatsApp hattı eşleştirmesi ve mesaj iletimi.</li>
            <li><strong>KVKK m. 5/2-ç (Hukuki Yükümlülük):</strong> 5651 sayılı kanun kapsamındaki trafik kayıtları ve mali kayıtlar.</li>
            <li><strong>KVKK m. 5/2-e (Hakkın Tesisi/Korunması):</strong> Olası hukuki uyuşmazlıklarda delil temini.</li>
            <li><strong>KVKK m. 5/2-f (Meşru Menfaat):</strong> Hesap güvenliği, yetkisiz erişimlerin ve bot saldırılarının önlenmesi.</li>
          </ul>
        </Section>

        <Section title="5. WhatsApp Güvenliği ve Uçtan Uca Şifreleme">
          <p>
            WhatsApp hattınızı bağladığınızda oluşan oturum anahtarları şifrelenerek güvenli sunucu ortamlarında
            saklanır. Bu anahtarlar yalnızca sizin adınıza mesaj iletmek ve yanıtları panele yansıtmak amacıyla
            kullanılır; mesajlarınız üçüncü taraflara satılmaz, taranmaz veya pazarlama amaçlı işlenmez.
          </p>
        </Section>

        <Section title="6. Ticari İleti Onayları ve Kara Liste (Ret)">
          <p>
            6563 sayılı Kanun uyarınca alıcılardan önceden onay alınmadan ticari elektronik ileti gönderilemez.
            Alıcıların çıkma (ret) talepleri paneldeki <strong>Kara Liste</strong> özelliğine eklenmelidir. Bu listeye
            alınan numaralara sistem üzerinden yeni bir kampanya gönderilmez.
          </p>
        </Section>

        <Section title="7. Saklama, Güvenlik ve İmha Süreçleri">
          <p>
            Verileriniz hesabınız aktif olduğu sürece muhafaza edilir. Kullanıcı panel üzerinden dilediği an bir kişi
            listesini, kampanyayı veya şablonu silebilir. Hesabınızı veya bağlı işletmenizi kalıcı olarak sildiğinizde;
            ilgili alıcı listeleri, kampanya verileri, mesaj geçmişi ve WhatsApp oturum anahtarları sunuculardan kalıcı
            olarak imha edilir veya anonimleştirilir. Kanuni zorunluluk kapsamındaki mali ve trafik logları yasal süreler
            sonunda silinir.
          </p>
        </Section>

        <Section title="8. KVKK Madde 11 Kapsamındaki Haklarınız">
          <p>
            KVKK 11. maddesi kapsamındaki haklarınızı (verilerin işlenip işlenmediğini öğrenme, düzeltme, silme, itiraz vb.)
            kullanmak için kayıtlı e-posta adresinizden{' '}
            <a href={`mailto:${LEGAL_CONTACT.kvkk}`} className="text-brand font-medium hover:underline">
              {LEGAL_CONTACT.kvkk}
            </a>{' '}
            adresine başvurabilirsiniz. Talepleriniz en geç otuz (30) gün içinde ücretsiz sonuçlandırılır.
          </p>
        </Section>
      </div>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2.5 text-[16px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  )
}
