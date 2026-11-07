import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import { Shell } from './site';
import './legal-pages.css';

const LAST_UPDATED = '7 Kasım 2026';

export function LegalPage({ kind }: { kind: 'gizlilik' | 'kosullar' }) {
  const isPrivacy = kind === 'gizlilik';

  return (
    <Shell>
      <main id="icerik" className="ms-legal-main">
        <div className="ms-container">
          {/* Breadcrumb & Header */}
          <div className="ms-legal-header">
            <nav className="ms-breadcrumb" aria-label="Bağlantı yolu">
              <Link href="/">Ana sayfa</Link>
              <ChevronRight size={14} />
              <span>{isPrivacy ? 'Gizlilik Politikası ve KVKK' : 'Kullanım Koşulları'}</span>
            </nav>

            <span className="ms-eyebrow">
              {isPrivacy ? 'YASAL UYUM VE AYDINLATMA' : 'HİZMET SÖZLEŞMESİ'}
            </span>

            <h1>
              {isPrivacy
                ? 'Gizlilik Politikası ve KVKK Aydınlatma Metni'
                : 'Kullanım Koşulları ve Hizmet Sözleşmesi'}
            </h1>

            <p className="ms-legal-lead">
              {isPrivacy
                ? 'Mesajify web sitesi, müşteri paneli, bağlı WhatsApp hatları ve kampanya süreçlerinde kişisel verilerin korunması, işlenmesi ve ilgili kişi hakları hakkında bilgilendirme.'
                : 'Mesajify platformu, web uygulaması, WhatsApp hat bağlantısı, toplu kampanya yönetimi ve paket kullanımına ilişkin karşılıklı hak ve yükümlülükler.'}
            </p>

            <div className="ms-legal-meta">
              <span>Son güncelleme: <strong>{LAST_UPDATED}</strong></span>
              <span>•</span>
              <span>Platform: <strong>Mesajify</strong></span>
            </div>
          </div>

          <div className="ms-legal-layout">
            {/* Table of contents sidebar */}
            <aside className="ms-legal-sidebar" aria-label="Sayfa içi gezinme">
              <span className="ms-legal-sidebar-title">Bu Sayfada</span>
              <nav className="ms-legal-nav">
                {isPrivacy ? (
                  <>
                    <a href="#veri-sorumlusu">1. Veri Sorumlusu ve Kapsam</a>
                    <a href="#sorumlu-isleyen-ayrimi">2. Veri Sorumlusu & İşleyen Ayrımı</a>
                    <a href="#islenen-veriler">3. İşlenen Veri Kategorileri</a>
                    <a href="#hukuki-sebepler">4. Hukuki İşleme Sebepleri</a>
                    <a href="#whatsapp-guvenlik">5. WhatsApp Entegrasyonu ve Güvenlik</a>
                    <a href="#ticari-ileti-iys">6. Ticari Elektronik İleti ve İYS</a>
                    <a href="#cerezler">7. Çerezler ve Oturum Tercihleri</a>
                    <a href="#veri-aktarimi">8. Veri Aktarımı ve Altyapı</a>
                    <a href="#saklama-imha">9. Saklama Süreleri ve İmha</a>
                    <a href="#kvkk-haklar">10. KVKK Hakları ve Başvuru</a>
                  </>
                ) : (
                  <>
                    <a href="#taraflar-kapsam">1. Taraflar ve Sözleşmenin Kapsamı</a>
                    <a href="#hizmetin-niteligi">2. Hizmetin Niteliği ve Modeli</a>
                    <a href="#hesap-guvenligi">3. Hesap Oluşturma ve Güvenlik</a>
                    <a href="#hat-baglantisi-risk">4. WhatsApp Hat Bağlantısı ve Riskler</a>
                    <a href="#kabul-edilebilir-kullanim">5. Kabul Edilebilir Kullanım & Anti-Spam</a>
                    <a href="#paketler-odeme-iade">6. Paketler, Ödeme ve İade Koşulları</a>
                    <a href="#fikri-mulkiyet">7. Fikrî ve Sınai Mülkiyet Hakları</a>
                    <a href="#sorumluluk-siniri">8. Sorumluluğun Sınırlandırılması</a>
                    <a href="#destek-bildirimler">9. İletişim ve Destek Süreçleri</a>
                    <a href="#yetkili-hukuk">10. Uygulanacak Hukuk ve Yetkili Mahkeme</a>
                  </>
                )}
              </nav>

              <div className="ms-legal-switch">
                {isPrivacy ? (
                  <Link href="/kullanim-kosullari" className="ms-legal-switch-link">
                    <FileText size={16} />
                    <span>Kullanım Koşullarını İncele</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <Link href="/gizlilik-politikasi" className="ms-legal-switch-link">
                    <ShieldCheck size={16} />
                    <span>Gizlilik & KVKK Metnini İncele</span>
                    <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            </aside>

            {/* Main legal content */}
            <div className="ms-legal-content">
              {isPrivacy ? <PrivacyContent /> : <TermsContent />}
            </div>
          </div>
        </div>
      </main>
    </Shell>
  );
}

function PrivacyContent() {
  return (
    <>
      <section id="veri-sorumlusu" className="ms-legal-section">
        <h2>1. Veri Sorumlusu ve Kapsam</h2>
        <p>
          Bu Aydınlatma Metni ve Gizlilik Politikası, 6698 sayılı Kişisel Verilerin Korunması Kanunu
          (“KVKK”) Madde 10 uyarınca aydınlatma yükümlülüğünün yerine getirilmesi amacıyla, veri sorumlusu
          sıfatıyla <strong>Mesajify</strong> (“Mesajify” veya “Platform”) tarafından hazırlanmıştır.
        </p>
        <p>
          İşbu metin; <strong>mesajify.com</strong> web sitesini, <strong>app.mesajify.com</strong> müşteri
          panelini, bağlı WhatsApp hatları üzerinden yürütülen mesajlaşma akışlarını, alıcı grubu ve kişi
          listesi yönetimini, Kreatif Stüdyo araçlarını ve müşteri destek kanallarını kullanan tüm ziyaretçi,
          üye ve kurumsal müşterilerin (“Kullanıcı”) kişisel veri işleme süreçlerini kapsamaktadır.
        </p>
        <p>
          Veri sorumlusu ile kişisel verilerin korunması, aydınlatma metni ve ilgili kişi başvuruları
          konusunda iletişime geçmek için resmî iletişim e-posta adresi:{' '}
          <a href="mailto:kvkk@mesajify.com"><strong>kvkk@mesajify.com</strong></a> veya genel destek için{' '}
          <a href="mailto:destek@mesajify.com"><strong>destek@mesajify.com</strong></a> adresidir.
        </p>
      </section>

      <section id="sorumlu-isleyen-ayrimi" className="ms-legal-section">
        <h2>2. Veri Sorumlusu ve Veri İşleyen Ayrımı</h2>
        <div className="ms-legal-callout">
          <p>
            <strong>Önemli Hukuki Hatırlatma:</strong> Mesajify, hesap sahipleri bakımından <em>Veri Sorumlusu</em>,
            panele yüklenen alıcı listeleri ve iletilen mesaj içerikleri bakımından ise <em>Veri İşleyen</em> konumundadır.
          </p>
        </div>
        <p>
          <strong>a) Hesap Sahiplerine Ait Veriler:</strong> Platforma kaydolan, paket satın alan ve paneli
          yöneten gerçek ve tüzel kişi temsilcilerinin üyelik ve fatura verileri bakımından Mesajify doğrudan
          Veri Sorumlusudur.
        </p>
        <p>
          <strong>b) Panele Yüklenen Alıcı Listeleri (Müşteri Verileri):</strong> Kullanıcının Excel aktarımı,
          rehber senkronizasyonu veya liste talebi yoluyla sisteme dahil ettiği üçüncü kişilere ait telefon numaraları,
          ad-soyad bilgileri ve kampanya mesaj metinleri bakımından <strong>Kullanıcı Veri Sorumlusudur</strong>.
          Mesajify, bu verileri yalnızca Kullanıcı’nın talimatları doğrultusunda teknik olarak işleyen ve ileten
          <strong> Veri İşleyen (Data Processor)</strong> sıfatını haizdir.
        </p>
        <p>
          Kullanıcı; panele yüklediği kişi listelerinde yer alan kişilerin verilerini hukuka uygun elde ettiğini,
          gereken aydınlatma yükümlülüklerini yerine getirdiğini ve 6563 sayılı Kanun uyarınca ticari ileti
          onaylarını aldığını peşinen kabul ve taahhüt eder.
        </p>
      </section>

      <section id="islenen-veriler" className="ms-legal-section">
        <h2>3. İşlenen Veri Kategorileri ve Amaçlar</h2>
        <p>
          Mesajify altyapısında yürütülen faaliyetler kapsamında işlenen kişisel veri kategorileri, elde edilme
          yöntemleri ve işleme amaçları aşağıdaki tabloda özetlenmiştir:
        </p>

        <div className="ms-legal-table-wrap">
          <table className="ms-legal-table">
            <thead>
              <tr>
                <th>Veri Kategorisi</th>
                <th>İşleme Amacı</th>
                <th>Elde Edilme Yöntemi</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Hesap ve Kimlik Bilgileri</strong></td>
                <td>Kullanıcı hesabı açma, kimlik doğrulama, güvenli oturum yönetimi ve işletme profili oluşturma.</td>
                <td>Kullanıcının kayıt veya giriş formunda paylaştığı ad-soyad, e-posta adresi, telefon ve şifrelenmiş parola.</td>
              </tr>
              <tr>
                <td><strong>WhatsApp Hat ve Oturum Verileri</strong></td>
                <td>Kullanıcının kendi WhatsApp hattını sisteme QR ile bağlayabilmesi ve mesajlaşma servisinin işletilmesi.</td>
                <td>WhatsApp Web protokolü oturum anahtarları ve bağlantı durum bilgisi (uçtan uca şifreli olarak saklanır).</td>
              </tr>
              <tr>
                <td><strong>Alıcı Listeleri ve Kampanya Kayıtları</strong></td>
                <td>Planlı kampanya oluşturma, seçilen kişi grubuna mesaj iletimi, teslimat durumu takibi ve kara liste filtreleme.</td>
                <td>Kullanıcının panele yüklediği Excel dosyaları, rehber aktarımları ve kampanya gönderim logları.</td>
              </tr>
              <tr>
                <td><strong>Gelen Kutusu İletişim Verileri</strong></td>
                <td>Gelen müşteri yanıtlarını aynı panelde görüntüleme, konuşma geçmişi sunma ve yapay zeka yanıt taslağı hazırlama.</td>
                <td>Bağlı hat üzerinden müşterilerin ilettiği mesajlar ve kullanıcı tarafından onaylanarak gönderilen yanıtlar.</td>
              </tr>
              <tr>
                <td><strong>Ödeme ve Fatura Kayıtları</strong></td>
                <td>Paket aboneliklerinin tanımlanması, lisanslı ödeme altyapısıyla tahsilat doğrulama, e-fatura düzenleme ve vergi mevzuatına uyum.</td>
                <td>Lisanslı ödeme sağlayıcısından gelen işlem referansı ve kullanıcının girdiği fatura unvan/adres bilgileri. (Hassas kart verileri sunucularımızda tutulmaz).</td>
              </tr>
              <tr>
                <td><strong>Teknik Erişim ve Trafik Logları</strong></td>
                <td>5651 sayılı Kanun uyarınca yasal log tutma yükümlülüğü, siber saldırıların engellenmesi, sistem ve hesap güvenliğinin korunması.</td>
                <td>Platforma erişim sırasında otomatik kaydedilen IP adresi, port, tarayıcı/cihaz bilgisi, istek zamanı ve durum kodları.</td>
              </tr>
              <tr>
                <td><strong>Müşteri Destek Verileri</strong></td>
                <td>Teknik destek, faturalama, kampanya akışı ve kullanıcı sorularının yanıtlanıp çözüme kavuşturulması.</td>
                <td>destek@mesajify.com veya iletişim formları üzerinden iletilen e-posta ve mesaj içerikleri.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p>
          Mesajify altyapısına özel nitelikli kişisel veri (sağlık, biyometrik, siyasi, dini veya sendikal veriler)
          girilmemelidir. Platformun işleyişi bu verileri kesinlikle talep etmez.
        </p>
      </section>

      <section id="hukuki-sebepler" className="ms-legal-section">
        <h2>4. Kişisel Veri İşlemenin Hukuki Sebepleri</h2>
        <p>
          Kişisel verileriniz, 6698 sayılı KVKK’nın 5. maddesinde belirtilen aşağıdaki hukuki sebeplere dayalı olarak
          işlenmektedir:
        </p>
        <ul>
          <li>
            <strong>Sözleşmenin kurulması veya ifası (KVKK m. 5/2-c):</strong> Kullanıcı kaydının açılması, WhatsApp
            hattının panelle eşleştirilmesi, kampanya planlama ve mesaj gönderim motorunun çalıştırılması, ortak gelen
            kutusu ve abonelik paket hizmetlerinin yerine getirilmesi.
          </li>
          <li>
            <strong>Hukuki yükümlülüklerin yerine getirilmesi (KVKK m. 5/2-ç):</strong> 5651 sayılı İnternet Ortamında
            Yapılan Yayınların Düzenlenmesi Hakkında Kanun uyarınca zorunlu trafik kayıtlarının tutulması, Türk Ticaret
            Kanunu ve Vergi Usul Kanunu kapsamında mali kayıt ve faturaların saklanması.
          </li>
          <li>
            <strong>Bir hakkın tesisi, kullanılması veya korunması (KVKK m. 5/2-e):</strong> Olası hukuki uyuşmazlıklarda
            delil temini, yetkili adli merciler nezdinde savunma hakkının kullanılması.
          </li>
          <li>
            <strong>Veri sorumlusunun meşru menfaati (KVKK m. 5/2-f):</strong> Temel hak ve özgürlüklerinize zarar vermemek
            kaydıyla; platformun siber güvenliğinin temin edilmesi, sahtecilik ve bot saldırılarının önlenmesi, altyapı
            performansının ve servis kalitesinin artırılması.
          </li>
        </ul>
      </section>

      <section id="whatsapp-guvenlik" className="ms-legal-section">
        <h2>5. WhatsApp Entegrasyonu ve Güvenlik İlkeleri</h2>
        <p>
          Mesajify, mesajlaşma altyapısını kullanıcının kendi onaylı WhatsApp hattı üzerinden çalıştırır. Entegrasyon
          sürecinde aşağıdaki katı güvenlik ilkeleri uygulanır:
        </p>
        <ul>
          <li>
            <strong>Uçtan Uca Şifreleme:</strong> WhatsApp hattınızın oturum açma anahtarları AES-256 ve modern kriptografik
            protokollerle şifrelenerek güvenli sunucu kapsüllerinde muhafaza edilir.
          </li>
          <li>
            <strong>Mesaj Gizliliği:</strong> Mesajify, müşterilerinizle aranızdaki kişisel mesajlaşmaları kesinlikle
            ticari amaçlarla okumaz, profillemez, üçüncü taraflara satmaz ya da devretmez.
          </li>
          <li>
            <strong>Doğal Gönderim ve Algoritmik Koruma:</strong> Platform, toplu gönderimlerde hat kısıtlama riskini
            azaltmak için insan davranışını taklit eden dinamik gönderim aralıkları, numara formatı doğrulama ve ısındırma
            eğrileri sunar.
          </li>
        </ul>
      </section>

      <section id="ticari-ileti-iys" className="ms-legal-section">
        <h2>6. Ticari Elektronik İleti ve İYS Uyumu</h2>
        <p>
          6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (ETK) ve Ticari İletişim ve Ticari Elektronik
          İletiler Hakkında Yönetmelik gereğince; alıcılara ticari tanıtım, reklam ve kampanya mesajı göndermeden önce
          hukuken geçerli onayların alınmış olması ve gerektiğinde İleti Yönetim Sistemi (İYS) kayıtlarının tamamlanmış
          olması <strong>hesap sahibinin yasal sorumluluğundadır</strong>.
        </p>
        <p>
          Mesajify, alıcıların ret (çıkma) hakkını kullanabilmesi için <strong>Kara Liste (Ret Listesi)</strong> modülü
          sunmaktadır. Ret talebinde bulunan alıcıların numaraları kara listeye kaydedildiğinde, sistem bu numaralara
          gelecekte yapılacak tüm kampanya gönderimlerini otomatik olarak bloke eder.
        </p>
      </section>

      <section id="cerezler" className="ms-legal-section">
        <h2>7. Tarayıcı Depolaması ve Çerezler</h2>
        <p>
          Mesajify web sitesi ve uygulamasında yalnızca teknik olarak zorunlu oturum çerezleri ile yerel depolama
          alanları (localStorage / sessionStorage) kullanılmaktadır. Bu mekanizmalar; güvenli oturumun sürdürülmesi,
          CSRF ataklarına karşı koruma ve form adımlarında tercihlerin korunması için gereklidir.
        </p>
        <p>
          Platformda üçüncü taraf reklam takipçileri, veri komisyoncusu pikselleri veya yeniden hedefleme çerezleri
          bulunmamaktadır. Tarayıcınızın ayarlarından çerezleri her zaman silebilir veya engelleyebilirsiniz; ancak bu
          durumda kullanıcı panelinde güvenli oturum açma özellikleri kısıtlanabilir.
        </p>
      </section>

      <section id="veri-aktarimi" className="ms-legal-section">
        <h2>8. Veri Aktarımı ve Altyapı Sağlayıcıları</h2>
        <p>
          Kişisel verileriniz; hizmetin teknik olarak sunulabilmesi ve yasal yükümlülüklerin ifası amacıyla yalnızca
          aşağıdaki taraflara ve KVKK m. 8 ve m. 9 hükümlerine uygun olarak aktarılabilir:
        </p>
        <ul>
          <li>
            <strong>Altyapı ve Bulut Sağlayıcıları:</strong> Platformun yüksek güvenlik standartlarında barındırılması
            ve veritabanı yedekliliği için lisanslı ve uluslararası güvenlik sertifikalarına (ISO 27001, SOC 2) sahip
            bulut sağlayıcıları (Vercel vb.).
          </li>
          <li>
            <strong>Lisanslı Ödeme Kuruluşları:</strong> Abonelik ve paket ödemelerinin tahsil edilmesi amacıyla BDDK
            ve TCMB lisanslı, PCI-DSS Seviye 1 uyumlu ödeme aracı kurumları.
          </li>
          <li>
            <strong>Yetkili Kamu Kurum ve Kuruluşları:</strong> Yasal bir zorunluluk gereği veya adli soruşturmalar
            kapsamında mahkemeler, savcılıklar ve kanunen yetkili resmi denetim mercileri.
          </li>
        </ul>
        <p>
          Mesajify, kullanıcıların veya alıcıların verilerini hiçbir surette reklam ajanslarına, veri simsarlarına veya
          üçüncü şahıslara ticari kazanç sağlamak amacıyla satmaz ve kiralamaz.
        </p>
      </section>

      <section id="saklama-imha" className="ms-legal-section">
        <h2>9. Veri Güvenliği, Saklama Süreleri ve İmha</h2>
        <p>
          Verileriniz, üyeliğiniz ve işletme hesabınız aktif olduğu müddetçe güvenli veritabanlarımızda saklanır. Kullanıcı
          dilediği an panel üzerinden belirli bir kişi grubunu, mesaj şablonunu veya kampanya geçmişini silebilir.
        </p>
        <p>
          Kullanıcı hesabının kapatılması veya silinmesi durumunda; ilgili hesaba ait kişi listeleri, mesaj logları ve
          WhatsApp oturum anahtarları sistemlerimizden kalıcı olarak silinir veya anonim hale getirilir. Türk Ticaret
          Kanunu ve Vergi Usul Kanunu uyarınca mali kayıt ve faturalar 10 yıl, 5651 sayılı Kanun uyarınca trafik logları
          ise kanunda öngörülen yasal süreler boyunca muhafaza edilir; süre sonunda imha edilir.
        </p>
      </section>

      <section id="kvkk-haklar" className="ms-legal-section">
        <h2>10. KVKK Madde 11 Kapsamında İlgili Kişi Hakları ve Başvuru Usulü</h2>
        <p>
          6698 sayılı KVKK’nın 11. maddesi uyarınca veri sahipleri olarak aşağıdaki haklara sahipsiniz:
        </p>
        <ul>
          <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme,</li>
          <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme,</li>
          <li>Kişisel verilerin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme,</li>
          <li>Yurt içinde veya yurt dışında kişisel verilerin aktarıldığı üçüncü kişileri bilme,</li>
          <li>Kişisel verilerin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme,</li>
          <li>KVKK 7. maddesi uyarınca verilerin silinmesini veya yok edilmesini isteme,</li>
          <li>Verilerin düzeltilmesi veya silinmesi halinde bu işlemlerin verilerin aktarıldığı üçüncü kişilere bildirilmesini isteme,</li>
          <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme,</li>
          <li>Kişisel verilerin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme.</li>
        </ul>
        <p>
          Yukarıda belirtilen haklarınızı kullanmak için başvurularınızı; kayıtlı e-posta adresiniz üzerinden{' '}
          <a href="mailto:kvkk@mesajify.com"><strong>kvkk@mesajify.com</strong></a> veya{' '}
          <a href="mailto:destek@mesajify.com"><strong>destek@mesajify.com</strong></a> adresine iletebilirsiniz.
          Talepleriniz, niteliğine göre en kısa sürede ve en geç <strong>otuz (30) gün</strong> içinde ücretsiz olarak
          sonuçlandırılacaktır.
        </p>
      </section>
    </>
  );
}

function TermsContent() {
  return (
    <>
      <section id="taraflar-kapsam" className="ms-legal-section">
        <h2>1. Taraflar ve Sözleşmenin Kapsamı</h2>
        <p>
          İşbu Kullanım Koşulları ve Hizmet Sözleşmesi (“Sözleşme”), <strong>Mesajify</strong> (“Mesajify” veya
          “Platform”) ile <strong>mesajify.com</strong> web sitesini, <strong>app.mesajify.com</strong> müşteri
          panelini ziyaret eden, üye olan, paket veya kota satın alan ya da sunulan hizmetlerden yararlanan gerçek
          veya tüzel kişiler (“Kullanıcı”) arasında elektronik ortamda akdedilmiştir.
        </p>
        <p>
          Platforma kayıt olan, giriş yapan veya sunulan herhangi bir servisi kullanan Kullanıcı, işbu Sözleşme’de
          yer alan tüm maddeleri okuduğunu, anladığını ve koşullara kayıtsız şartsız uymayı kabul ettiğini beyan eder.
          Koşulları kabul etmiyorsanız lütfen Platformu ve bağlı hizmetleri kullanmayınız.
        </p>
      </section>

      <section id="hizmetin-niteligi" className="ms-legal-section">
        <h2>2. Hizmetin Niteliği ve Modeli</h2>
        <p>
          Mesajify; kullanıcıların kendi WhatsApp hatlarını bağlayarak toplu ve planlı mesaj kampanyaları hazırlamasına,
          Excel ve telefon rehberinden kişi listesi aktarmasına, işletme listesi talepleri oluşturmasına, gelen yanıtları
          tek merkezden yönetmesine ve yapay zeka desteğiyle mesaj ve kreatif taslaklar üretmesine imkân sağlayan bir
          bulut yazılım (SaaS) platformudur.
        </p>
        <p>
          Hizmet; paket bazlı üyelik modeli (Starter, Pro, Enterprise) üzerinden sunulur. Her paketin desteklediği
          WhatsApp hat sayısı, aylık gönderim kotası ve özellik kapsamı web sitesinde ve panelde açıkça belirtilmiştir.
        </p>
      </section>

      <section id="hesap-guvenligi" className="ms-legal-section">
        <h2>3. Hesap Oluşturma, Giriş ve Güvenlik</h2>
        <p>
          Platformdan yararlanabilmek için Kullanıcı’nın güncel ve geçerli bir e-posta adresiyle hesap oluşturması
          gerekmektedir. Kayıt esnasında paylaşılan bilgilerin doğruluğu ve güncelliği Kullanıcı’nın sorumluluğundadır.
        </p>
        <p>
          Kullanıcı, hesap şifresinin ve oturum bilgilerinin gizliliğini sağlamakla bizzat yükümlüdür. Hesap bilgileri
          üçüncü şahıslara devredilemez, kiralanamaz veya ortak kullanıma açılamaz. Hesabın yetkisiz kişilerce ele
          geçirildiğinden veya şüpheli işlem yapıldığından şüphelenildiğinde derhal{' '}
          <a href="mailto:destek@mesajify.com"><strong>destek@mesajify.com</strong></a> adresine bildirimde bulunulmalıdır.
        </p>
      </section>

      <section id="hat-baglantisi-risk" className="ms-legal-section">
        <h2>4. WhatsApp Hat Bağlantısı ve Hesap Risk Bildirimi</h2>
        <div className="ms-legal-callout">
          <p>
            <strong>Önemli Risk Bildirimi:</strong> Hizmet, mesajların doğrudan Kullanıcı’nın kendi WhatsApp hattı
            üzerinden gönderilmesi esasına dayanır. Mesajify, WhatsApp / Meta ile doğrudan resmi bir ortaklık
            veya Business Solution Provider (BSP) ilişkisi taşımaz.
          </p>
        </div>
        <p>
          WhatsApp platform kuralları gereğince; kısa sürede çok sayıda bilinmeyen numaraya mesaj gönderilmesi,
          alıcılar tarafından mesajların şikâyet edilmesi veya spam olarak işaretlenmesi durumunda WhatsApp ilgili hatta
          geçici veya kalıcı kısıtlama (numara engelleme) uygulayabilir.
        </p>
        <p>
          Mesajify; hat kısıtlama riskini en aza indirmek amacıyla numara doğrulama, dinamik bekleme süreleri,
          ısındırma planı ve otomatik durdurma mekanizmaları sunar. Bununla birlikte hiçbir hattın kısıtlanmayacağına
          dair mutlak bir garanti verilemez. Hattınızın WhatsApp tarafından kısıtlanması, askıya alınması veya
          kapatılmasından doğabilecek doğrudan ya da dolaylı zararlardan Mesajify hiçbir surette sorumlu tutulamaz.
        </p>
      </section>

      <section id="kabul-edilebilir-kullanim" className="ms-legal-section">
        <h2>5. Kabul Edilebilir Kullanım, Anti-Spam ve Yasal Yükümlülükler</h2>
        <p>
          Kullanıcı, Platformu kullanırken Türkiye Cumhuriyeti’nde yürürlükte olan tüm mevzuata, özellikle 6563 sayılı
          Elektronik Ticaretin Düzenlenmesi Hakkında Kanun (ETK), Ticari İletişim ve Ticari Elektronik İletiler Hakkında
          Yönetmelik ve 6698 sayılı KVKK hükümlerine uymakla bizzat yükümlüdür.
        </p>
        <p>Aşağıdaki eylemler kesinlikle yasaktır ve tespiti halinde hesap derhal kapatılır:</p>
        <ul>
          <li>İzinsiz, rızasız veya yasa dışı elde edilmiş numara listelerine spam/soğuk mesaj gönderimi yapmak,</li>
          <li>Yanıltıcı, aldatıcı, dolandırıcılık amaçlı, saadet zinciri veya yasa dışı bahis içerikleri yaymak,</li>
          <li>Nefret söylemi, hakaret, tehdit veya genel ahlaka aykırı ifadeler içeren iletiler göndermek,</li>
          <li>Ruhsatsız ilaç, tütün, yasa dışı madde veya taklit ürün tanıtımı yapmak,</li>
          <li>Platformun yazılım kodlarını tersine mühendisliğe tabi tutmak, güvenlik duvarlarını aşmaya çalışmak veya altyapıya zarar verici otomatik istekler göndermek.</li>
        </ul>
        <p>
          Kullanıcı, mesaj gönderdiği kişilerden gelen ret/çıkma taleplerini sistemin kara liste modülüne eklemekle
          ve bu alıcılara tekrar mesaj göndermemekle yükümlüdür. Yasa dışı gönderimlerden doğacak her türlü idari para
          cezası, hukuki ve cezai sorumluluk münhasıran Kullanıcı’ya aittir.
        </p>
      </section>

      <section id="paketler-odeme-iade" className="ms-legal-section">
        <h2>6. Paketler, Ödeme ve İade Koşulları</h2>
        <p>
          Paket abonelik bedelleri, hat kapasiteleri ve aylık mesaj kotaları web sitesinde ilan edilen güncel fiyatlar
          üzerinden tahsil edilir. Ödemeler lisanslı ve PCI-DSS uyumlu güvenli ödeme aracı kuruluşları üzerinden 3D Secure
          güvencesiyle tahsil edilmektedir.
        </p>
        <p>
          6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği’nin 15/1-ğ maddesi uyarınca;
          <em>“Elektronik ortamda anında ifa edilen hizmetler veya tüketiciye anında teslim edilen gayrimaddi mallara ilişkin sözleşmeler”</em>
          kapsamında Kullanıcı hesabına tanımlanan, kısmen veya tamamen kullanılan paketlerde ve mesaj kotalarında cayma
          hakkı ve ücret iadesi uygulanmaz.
        </p>
        <p>
          Abonelik iptali kullanıcı panelindeki ayarlar bölümünden dönem sonu için yapılabilir. İptal durumunda mevcut
          dönem sonuna kadar haklar kullanılabilir, dönem sonunda yenileme durdurulur.
        </p>
      </section>

      <section id="fikri-mulkiyet" className="ms-legal-section">
        <h2>7. Fikrî ve Sınai Mülkiyet Hakları</h2>
        <p>
          Mesajify markası, logosu, web sitesi tasarımı, arayüz bileşenleri, veritabanı mimarisi, kaynak kodları,
          animasyonları ve dokümantasyonları dahil tüm platform unsurları Mesajify’nin mülkiyetindedir ve ulusal/uluslararası
          fikrî mülkiyet hukuku ile korunmaktadır.
        </p>
        <p>
          Kullanıcı’ya tanınan hak; yalnızca Sözleşme süresince Platformdan faydalanmasını sağlayan, münhasır olmayan,
          devredilemez bir kullanım lisansıdır. Yazılımın kaynak kodlarının kopyalanması, çoğaltılması veya taklit edilmesi
          yasaktır.
        </p>
        <p>
          WhatsApp, Meta ve diğer ilgili logolar/markalar kendi sahiplerinin mülkiyetindedir; Mesajify sitesinde
          anılmaları entegrasyon bağlamının açıklanması amacı taşır, resmî sponsorluk veya bağlılık ifade etmez.
        </p>
      </section>

      <section id="sorumluluk-siniri" className="ms-legal-section">
        <h2>8. Sorumluluğun Sınırlandırılması ve Kesintisizlik</h2>
        <p>
          Mesajify, platformun kesintisiz, hızlı ve güvenli biçimde çalışması için gerekli teknik tedbirleri almaktadır.
          Bununla birlikte genel internet altyapısındaki arızalar, telekomünikasyon sağlayıcılarının kesintileri,
          WhatsApp sunucu güncellemeleri veya protokol değişiklikleri sebebiyle meydana gelebilecek geçici aksaklıklardan
          Mesajify sorumlu tutulamaz.
        </p>
        <p>
          Mesajify, Kullanıcı’nın gönderdiği mesajların açılma, okunma veya satışa dönüşme oranına ilişkin herhangi bir
          ticari başarı garantisi vermez. Mesajify’nin işbu Sözleşme kapsamındaki kümülatif sorumluluğu, her halükarda
          Kullanıcı’nın son 3 (üç) ay içerisinde ödediği toplam hizmet bedeli ile sınırlıdır.
        </p>
      </section>

      <section id="destek-bildirimler" className="ms-legal-section">
        <h2>9. İletişim, Destek ve Bildirimler</h2>
        <p>
          Mesajify kullanımına, paketlere ve teknik konulara ilişkin tüm destek talepleri için resmî iletişim adresi{' '}
          <a href="mailto:destek@mesajify.com"><strong>destek@mesajify.com</strong></a> e-posta adresidir.
        </p>
        <p>
          Mesajify tarafından Kullanıcı’ya yapılacak tüm resmî bildirimler, Kullanıcı’nın sisteme kayıtlı güncel e-posta
          adresine iletilmek suretiyle geçerli şekilde tebliğ edilmiş sayılır.
        </p>
      </section>

      <section id="yetkili-hukuk" className="ms-legal-section">
        <h2>10. Uygulanacak Hukuk ve Yetkili Mahkeme</h2>
        <p>
          İşbu Sözleşme’nin uygulanmasında, yorumlanmasında ve Sözleşme’den doğabilecek tüm ihtilaflarda Türkiye Cumhuriyeti
          Kanunları uygulanır.
        </p>
        <p>
          Taraflar arasında çıkabilecek tüm hukuki uyuşmazlıkların çözümünde{' '}
          <strong>İstanbul (Çağlayan) Mahkemeleri ve İcra Daireleri</strong> münhasıran yetkilidir. Tüketici sıfatını
          haiz kullanıcıların kanunen belirlenen parasal sınırlar dahilindeki Tüketici Hakem Heyetlerine başvuru hakkı
          saklıdır.
        </p>
        <p>
          İşbu Sözleşme, Platformda yayımlandığı tarihte yürürlüğe girer ve Kullanıcı Platformu kullandığı sürece geçerliliğini
          korur.
        </p>
      </section>
    </>
  );
}
