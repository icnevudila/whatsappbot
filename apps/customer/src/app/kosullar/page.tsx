import type { Metadata } from 'next'
import Link from 'next/link'
import { BRAND_NAME } from '@/components/brand'
import { LEGAL_CONTACT, legalEntityName } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları ve Hizmet Sözleşmesi',
  description: `${BRAND_NAME} hizmet sözleşmesi, WhatsApp hat kullanımı, kampanya kuralları ve paket koşulları.`,
}

const UPDATED_AT = '7 Kasım 2026'

export default function TermsPage() {
  const operator = legalEntityName()

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
          Hizmet Sözleşmesi
        </span>
        <h1 className="text-[28px] md:text-[34px] font-bold tracking-[-0.03em] text-ink">
          Kullanım Koşulları ve Hizmet Sözleşmesi
        </h1>
        <div className="mt-3 flex items-center gap-3 text-[12.5px] text-ink-muted">
          <span>Son güncelleme: <strong className="font-medium text-ink">{UPDATED_AT}</strong></span>
          <span>•</span>
          <span>Hizmet Sağlayıcı: <strong className="font-medium text-ink">{operator}</strong></span>
        </div>
      </div>

      <div className="flex flex-col gap-8 text-[14px] leading-relaxed text-ink-muted">
        <Section title="1. Taraflar ve Hizmet Sağlayıcı">
          <p>
            İşbu Kullanım Koşulları ve Hizmet Sözleşmesi (“Sözleşme”), {BRAND_NAME} platformunu ve müşteri
            panelini sunan <strong className="text-ink font-medium">{operator}</strong> ile platforma üye olan
            veya hizmetlerden yararlanan gerçek ya da tüzel kişi (“Kullanıcı”) arasında yürürlüktedir.
          </p>
          <p>
            Resmî destek ve bildirim kanalı:{' '}
            <a href={`mailto:${LEGAL_CONTACT.support}`} className="text-brand font-medium hover:underline">
              {LEGAL_CONTACT.support}
            </a>
          </p>
        </Section>

        <Section title="2. Hizmetin Kapsamı ve Çalışma Modeli">
          <p>
            {BRAND_NAME}; kullanıcıların kendi onaylı WhatsApp hatlarını QR kod ile bağlayarak toplu ve planlı
            kampanya mesajları göndermesini, kişi listelerini düzenlemesini, gelen yanıtları tek bir gelen kutusunda
            karşılamasını ve yapay zeka asistanıyla içerik taslakları hazırlamasını sağlayan bir bulut (SaaS)
            yazılımıdır.
          </p>
          <p>
            Hizmet, WhatsApp&apos;ın resmi Cloud/On-Premises Business API&apos;si üzerinden çalışmaz; mesajlar
            doğrudan kullanıcının panele bağladığı kendi WhatsApp hattından çıkar.
          </p>
        </Section>

        <Section title="3. WhatsApp Hat Bağlantısı ve Hesap Risk Bildirimi">
          <div className="rounded-lg bg-amber-50/70 border-l-4 border-amber-600 p-4 text-[13.5px] text-amber-950">
            <strong>Risk Bildirimi:</strong> WhatsApp / Meta, platform politikaları ve spam algılama kriterleri
            doğrultusunda toplu mesaj iletimi yapan hatlara geçici veya kalıcı kısıtlama uygulayabilir.
          </div>
          <p>
            {BRAND_NAME}, hat kısıtlama riskini en aza indirmek için numara doğrulama, ısındırma eğrisi, rastgele
            gönderim aralıkları ve otomatik durdurma algoritmaları uygular. Bununla birlikte hiçbir hattın
            kısıtlanmayacağı garanti edilemez. Hattınızın WhatsApp tarafından geçici veya kalıcı olarak
            kısıtlanmasından doğabilecek doğrudan veya dolaylı zararlardan {BRAND_NAME} sorumlu tutulamaz.
          </p>
        </Section>

        <Section title="4. Kabul Edilmeyen Kullanım ve Anti-Spam Politikası">
          <p>
            Kullanıcı, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (ETK) ve 6698 sayılı KVKK
            başta olmak üzere yürürlükteki tüm yasalara uymakla yükümlüdür.
          </p>
          <p>Aşağıdaki eylemler kesinlikle yasaktır ve tespiti halinde hesap derhal kapatılır:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>İzinsiz, rızasız elde edilmiş numara listelerine spam/soğuk mesaj gönderimi,</li>
            <li>Yanıltıcı, saadet zinciri, dolandırıcılık veya yasa dışı bahis içerikleri,</li>
            <li>Nefret söylemi, hakaret, tehdit veya genel ahlaka aykırı iletiler,</li>
            <li>Ruhsatsız ilaç, tütün, yasa dışı ürün veya taklit malların tanıtımı,</li>
            <li>Sistem altyapısına zarar verici tersine mühendislik veya otomatik saldırı girişimleri.</li>
          </ul>
          <p>
            Kullanıcı, alıcılardan gelen ret taleplerini sistemin kara liste modülüne eklemekle yükümlüdür.
          </p>
        </Section>

        <Section title="5. Paketler, Ödeme ve İade Koşulları">
          <p>
            Hizmet, paket kapasiteleri (Starter, Pro, Enterprise) ve belirlenen aylık mesaj kotaları üzerinden
            sunulur. Ödemeler lisanslı ve güvenli ödeme sağlayıcıları aracılığıyla tahsil edilir.
          </p>
          <p>
            6502 sayılı Kanun ve Mesafeli Sözleşmeler Yönetmeliği m. 15/1-ğ uyarınca elektronik ortamda anında
            ifa edilen ve hesaba tanımlanan gayrimaddi hizmetlerde cayma hakkı ve ücret iadesi uygulanmaz.
            Abonelik iptali panel ayarlarından dönem sonu için yapılabilir; dönem sonuna kadar mevcut haklar geçerlidir.
          </p>
        </Section>

        <Section title="6. Fikrî Mülkiyet Hakları">
          <p>
            {BRAND_NAME} markası, logosu, arayüz tasarımları, veritabanı yapısı ve kaynak kodları {operator}’a
            aittir. Kullanıcıya yalnızca münhasır olmayan bir kullanım lisansı verilir.
          </p>
          <p>
            WhatsApp ve Meta markaları kendi tescilli sahiplerine aittir; sistemimizde anılmaları entegrasyon
            açıklaması amaçlıdır, resmî sponsorluk veya ortaklık ifade etmez.
          </p>
        </Section>

        <Section title="7. Hizmetin Sürekliliği ve Sorumluluk Sınırı">
          <p>
            Sunucu bakımları, telekomünikasyon kesintileri veya WhatsApp protokol değişiklikleri sebebiyle hizmette
            geçici aksaklıklar yaşanabilir. {BRAND_NAME}’nin kümülatif sorumluluğu, her halükarda Kullanıcı’nın son
            3 (üç) ay içerisinde ödediği toplam bedel ile sınırlıdır.
          </p>
        </Section>

        <Section title="8. Uygulanacak Hukuk ve Yetkili Mahkeme">
          <p>
            İşbu Sözleşme Türkiye Cumhuriyeti Hukuku’na tabidir. Çıkabilecek tüm hukuki uyuşmazlıklarda{' '}
            <strong className="text-ink font-medium">İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri</strong>{' '}
            münhasıran yetkilidir.
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
