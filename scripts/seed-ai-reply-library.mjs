import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Client } from 'pg'

function loadEnv(file) {
  if (!fs.existsSync(file)) return {}
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!match || match[1].startsWith('#')) continue
    let value = match[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[match[1]] = value
  }
  return env
}

function normalizeForLibrary(input) {
  return input
    .trim()
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
}

function fingerprint(input) {
  return createHash('sha256').update(normalizeForLibrary(input)).digest('hex')
}

function shouldHistoryAffectCache(message) {
  const normalized = normalizeForLibrary(message)
  if (normalized.length < 18) return true
  return /\b(o|onu|bunu|şunu|su|bu|evet|hayır|hayir|tamam|peki|olur|kaç|kac)\b/u.test(normalized)
}

const catalog = [
  {
    sample: 'Merhaba, bilgi alabilir miyim?',
    suggestions: [
      ['KISA & NET', 'Merhaba, tabii yardımcı olalım. Hangi konuda bilgi almak istersiniz?'],
      ['SAMIMI', 'Merhaba, memnuniyetle yardımcı oluruz. Kısaca neye ihtiyacınız olduğunu yazarsanız hemen bakalım.'],
      ['YONLENDIRICI', 'Merhaba, size en doğru bilgiyi verebilmemiz için ilgilendiğiniz ürün ya da hizmeti paylaşır mısınız?'],
    ],
  },
  {
    sample: 'Fiyat bilgisi alabilir miyim?',
    suggestions: [
      ['KISA & NET', 'Tabii, fiyat bilgisi için ihtiyacınızı kısaca paylaşır mısınız? Size en uygun bilgiyi iletelim.'],
      ['SAMIMI', 'Elbette, yardımcı olalım. Detayı netleştirirsek size en doğru fiyat bilgisini paylaşabiliriz.'],
      ['YONLENDIRICI', 'Fiyatlandırma ihtiyaca göre değişebilir. Kullanım ya da talep detayınızı yazarsanız net bilgi iletelim.'],
    ],
  },
  {
    sample: 'Paketleriniz hakkında bilgi verir misiniz?',
    suggestions: [
      ['KISA & NET', 'Tabii, paketler hakkında yardımcı olabiliriz. İhtiyacınızı yazarsanız en uygun seçeneği önerebiliriz.'],
      ['SAMIMI', 'Memnuniyetle. Size uygun paketi bulmak için kullanım amacınızı kısaca öğrenebilir miyiz?'],
      ['YONLENDIRICI', 'Paketleri doğru eşleştirmek için aylık kullanım, ekip sayısı veya beklentinizi paylaşmanız yeterli.'],
    ],
  },
  {
    sample: 'Ürün görsellerini görebilir miyim?',
    suggestions: [
      ['KISA & NET', 'Tabii, ürün görselleri için yardımcı olalım. Hangi ürünleri görmek istediğinizi paylaşır mısınız?'],
      ['SAMIMI', 'Elbette, ilgilendiğiniz ürünleri yazarsanız size uygun görselleri ve detayları iletelim.'],
      ['YONLENDIRICI', 'Doğru görselleri paylaşabilmemiz için ürün adı, model veya kullanım amacınızı iletebilirsiniz.'],
    ],
  },
  {
    sample: 'Kurulum nasıl yapılıyor?',
    suggestions: [
      ['KISA & NET', 'Kurulumda size adım adım yardımcı oluyoruz. Başlamak için mevcut ihtiyacınızı paylaşmanız yeterli.'],
      ['SAMIMI', 'Merak etmeyin, kurulum sürecinde destek oluyoruz. Hangi aşamada olduğunuzu yazarsanız yönlendirelim.'],
      ['YONLENDIRICI', 'Kurulum için hesap ve kullanım bilgilerinizi netleştirip en uygun adımları birlikte tamamlayabiliriz.'],
    ],
  },
  {
    sample: 'WhatsApp entegrasyonu var mı?',
    suggestions: [
      ['KISA & NET', 'Evet, WhatsApp tarafında destek sağlayabiliyoruz. Kullanmak istediğiniz hattı ve senaryoyu paylaşır mısınız?'],
      ['SAMIMI', 'Evet, yardımcı oluruz. WhatsApp hattınızı nasıl kullanmak istediğinizi yazarsanız en doğru yolu söyleyelim.'],
      ['YONLENDIRICI', 'Entegrasyon için hat durumu, kullanım amacı ve mesaj hacmini öğrenirsek sizi doğru şekilde yönlendirebiliriz.'],
    ],
  },
  {
    sample: 'Ödeme seçenekleriniz neler?',
    suggestions: [
      ['KISA & NET', 'Ödeme seçenekleri konusunda yardımcı olabiliriz. Tercih ettiğiniz ödeme yöntemini paylaşır mısınız?'],
      ['SAMIMI', 'Elbette, ödeme tarafını birlikte netleştiririz. Size uygun yöntemi yazarsanız kontrol edelim.'],
      ['YONLENDIRICI', 'Ödeme ve faturalandırma detayları için firma bilgilerinizi ve tercih ettiğiniz yöntemi paylaşabilirsiniz.'],
    ],
  },
  {
    sample: 'Fatura kesiyor musunuz?',
    suggestions: [
      ['KISA & NET', 'Evet, fatura konusunda yardımcı olabiliriz. Firma bilgilerinizi paylaşırsanız süreci başlatalım.'],
      ['SAMIMI', 'Tabii, fatura bilgilerinizi ilettiğinizde gerekli yönlendirmeyi yapabiliriz.'],
      ['YONLENDIRICI', 'Fatura için ünvan, vergi bilgileri ve iletişim bilgilerinizi paylaşmanız yeterli olacaktır.'],
    ],
  },
  {
    sample: 'Ne zaman dönüş yaparsınız?',
    suggestions: [
      ['KISA & NET', 'En kısa sürede dönüş yapacağız. Aciliyetiniz varsa buradan not düşebilirsiniz.'],
      ['SAMIMI', 'Mesajınızı aldık, mümkün olan en kısa sürede yardımcı olacağız. Beklettiğimiz için teşekkür ederiz.'],
      ['YONLENDIRICI', 'Daha hızlı ilerleyebilmemiz için konu başlığını ve varsa aciliyet bilgisini paylaşabilirsiniz.'],
    ],
  },
  {
    sample: 'Destek alabilir miyim?',
    suggestions: [
      ['KISA & NET', 'Tabii, destek olabiliriz. Yaşadığınız durumu kısaca yazar mısınız?'],
      ['SAMIMI', 'Elbette, birlikte bakalım. Sorunu ve mümkünse ekran görüntüsünü paylaşırsanız daha hızlı çözeriz.'],
      ['YONLENDIRICI', 'Destek için işlem yaptığınız adımı, aldığınız hatayı ve hesabınızla ilgili kısa bilgiyi iletebilirsiniz.'],
    ],
  },
  {
    sample: 'Sorun yaşıyorum, yardımcı olur musunuz?',
    suggestions: [
      ['KISA & NET', 'Tabii, yardımcı olalım. Sorunun ne zaman başladığını ve ne gördüğünüzü yazar mısınız?'],
      ['SAMIMI', 'Geçmiş olsun, hemen bakalım. Kısaca hangi ekranda ne yaşadığınızı anlatmanız yeterli.'],
      ['YONLENDIRICI', 'Sorunu hızlı çözebilmemiz için hata metni, işlem adımı ve varsa ekran görüntüsünü paylaşabilirsiniz.'],
    ],
  },
  {
    sample: 'Siparişimin durumu nedir?',
    suggestions: [
      ['KISA & NET', 'Kontrol edebilmemiz için sipariş numaranızı veya kayıtlı telefon bilginizi paylaşır mısınız?'],
      ['SAMIMI', 'Tabii, hemen yardımcı olalım. Sipariş numaranızı iletirseniz durumunu kontrol edebiliriz.'],
      ['YONLENDIRICI', 'Sipariş durumunu net paylaşabilmemiz için sipariş numarası, ad soyad veya telefon bilginizi yazabilirsiniz.'],
    ],
  },
  {
    sample: 'Kargo ne zaman çıkar?',
    suggestions: [
      ['KISA & NET', 'Kargo durumunu kontrol edebilmemiz için sipariş bilginizi paylaşır mısınız?'],
      ['SAMIMI', 'Elbette, kargo sürecine bakalım. Sipariş numaranızı yazarsanız size bilgi verelim.'],
      ['YONLENDIRICI', 'Kargo tarihi siparişe göre değişebilir. Sipariş numaranızı iletirseniz net kontrol sağlayalım.'],
    ],
  },
  {
    sample: 'İade veya değişim yapabilir miyim?',
    suggestions: [
      ['KISA & NET', 'İade/değişim için yardımcı olabiliriz. Sipariş bilginizi ve talebinizi paylaşır mısınız?'],
      ['SAMIMI', 'Tabii, süreci birlikte kontrol edelim. Ürün ve sipariş detayını yazmanız yeterli.'],
      ['YONLENDIRICI', 'İade/değişim koşullarını değerlendirmek için sipariş numarası, ürün ve talep nedenini iletebilirsiniz.'],
    ],
  },
  {
    sample: 'Randevu oluşturabilir miyiz?',
    suggestions: [
      ['KISA & NET', 'Tabii, randevu için uygun gün ve saat aralığınızı paylaşır mısınız?'],
      ['SAMIMI', 'Memnuniyetle planlayalım. Size uygun birkaç zaman aralığını yazarsanız yardımcı olalım.'],
      ['YONLENDIRICI', 'Randevu oluşturmak için ad soyad, konu ve uygun zaman aralığınızı paylaşabilirsiniz.'],
    ],
  },
  {
    sample: 'Beni arar mısınız?',
    suggestions: [
      ['KISA & NET', 'Tabii, arama için uygun olduğunuz saat aralığını paylaşır mısınız?'],
      ['SAMIMI', 'Elbette, sizi arayabiliriz. Uygun zamanınızı yazarsanız ona göre dönüş yapalım.'],
      ['YONLENDIRICI', 'Arama planlamak için telefon numaranızı, konu başlığını ve uygun saat aralığını iletebilirsiniz.'],
    ],
  },
  {
    sample: 'Adresiniz nerede?',
    suggestions: [
      ['KISA & NET', 'Adres bilgisi için yardımcı olabiliriz. Hangi lokasyon veya hizmet noktası için soruyorsunuz?'],
      ['SAMIMI', 'Tabii, adres bilgisini paylaşalım. Hangi şube ya da lokasyonla ilgileniyorsunuz?'],
      ['YONLENDIRICI', 'Size doğru adresi iletebilmemiz için gitmek istediğiniz lokasyonu veya bulunduğunuz bölgeyi yazabilirsiniz.'],
    ],
  },
  {
    sample: 'Çalışma saatleriniz nedir?',
    suggestions: [
      ['KISA & NET', 'Çalışma saatleri için yardımcı olabiliriz. Hangi gün için bilgi almak istiyorsunuz?'],
      ['SAMIMI', 'Tabii, çalışma saatlerini paylaşalım. Gün veya lokasyon belirtirseniz net bilgi verelim.'],
      ['YONLENDIRICI', 'Saat bilgisi lokasyona göre değişebileceği için ilgili şube ya da günü paylaşmanız yeterli.'],
    ],
  },
  {
    sample: 'Teşekkür ederim, iyi çalışmalar.',
    suggestions: [
      ['KISA & NET', 'Rica ederiz, size de iyi çalışmalar.'],
      ['SAMIMI', 'Biz teşekkür ederiz. Her zaman yardımcı olmaktan memnuniyet duyarız.'],
      ['YONLENDIRICI', 'Rica ederiz. Başka bir ihtiyacınız olursa buradan bize yazabilirsiniz.'],
    ],
  },
  {
    sample: 'Tamamdır, kolay gelsin.',
    suggestions: [
      ['KISA & NET', 'Teşekkür ederiz, size de kolay gelsin.'],
      ['SAMIMI', 'Çok teşekkür ederiz, size de kolay gelsin. Görüşmek üzere.'],
      ['YONLENDIRICI', 'Teşekkür ederiz. İhtiyacınız olduğunda her zaman buradan ulaşabilirsiniz.'],
    ],
  },
  {
    sample: 'İndirim veya kampanya var mı?',
    suggestions: [
      ['KISA & NET', 'Güncel kampanya bilgisini kontrol edip paylaşabiliriz. Hangi ürün veya hizmetle ilgileniyorsunuz?'],
      ['SAMIMI', 'Tabii, kampanya varsa size en uygun seçeneği iletelim. İlgilendiğiniz alanı yazar mısınız?'],
      ['YONLENDIRICI', 'Kampanya uygunluğunu netleştirmek için ürün/hizmet ve kullanım ihtiyacınızı paylaşabilirsiniz.'],
    ],
  },
  {
    sample: 'Sözleşme veya taahhüt var mı?',
    suggestions: [
      ['KISA & NET', 'Sözleşme/taahhüt detayları seçilen hizmete göre değişebilir. İhtiyacınızı paylaşırsanız netleştirelim.'],
      ['SAMIMI', 'Elbette, bu konuyu açıkça netleştirelim. Hangi hizmet için sorduğunuzu yazabilir misiniz?'],
      ['YONLENDIRICI', 'Taahhüt koşullarını doğru paylaşabilmemiz için düşündüğünüz paket ya da kullanım senaryosunu iletebilirsiniz.'],
    ],
  },
  {
    sample: 'Nasıl başlayabiliriz?',
    suggestions: [
      ['KISA & NET', 'Başlamak için ihtiyacınızı ve iletişim bilgilerinizi paylaşmanız yeterli. Sizi yönlendirelim.'],
      ['SAMIMI', 'Harika, birlikte hızlıca başlatabiliriz. Ne yapmak istediğinizi kısaca yazarsanız ilk adımı atalım.'],
      ['YONLENDIRICI', 'Başlangıç için hedefinizi, kullanım hacminizi ve varsa mevcut sisteminizi paylaşabilirsiniz.'],
    ],
  },
]

const salesCatalog = [
  ['Merhaba kampanya hakkında bilgi almak istiyorum.', 'Kampanya detaylarını memnuniyetle paylaşalım. Hangi ürün ya da hizmet için bilgi almak istiyorsunuz?'],
  ['Kampanyanız hala geçerli mi?', 'Güncel kampanya durumunu kontrol edip bilgi verelim. İlgilendiğiniz ürün veya hizmeti yazar mısınız?'],
  ['Bu kampanyadan nasıl yararlanabilirim?', 'Kampanyadan yararlanmanız için size yardımcı olabiliriz. İletişim ve ihtiyaç bilgilerinizi paylaşmanız yeterli.'],
  ['Bana özel teklif hazırlayabilir misiniz?', 'Tabii, ihtiyacınızı paylaşırsanız size uygun bir teklif hazırlayabiliriz.'],
  ['Toplu alımda indirim var mı?', 'Toplu alım için ayrıca değerlendirme yapabiliriz. Adet ve ihtiyaç detayını paylaşır mısınız?'],
  ['Fiyat biraz yüksek geldi.', 'Anlıyoruz. İhtiyacınızı netleştirirsek size daha uygun seçenekleri birlikte değerlendirebiliriz.'],
  ['Daha uygun bir paket var mı?', 'Evet, ihtiyaca göre daha uygun seçenekleri konuşabiliriz. Kullanım amacınızı kısaca paylaşır mısınız?'],
  ['Rakip firmayla karşılaştırınca farkınız nedir?', 'Farkları net anlatabilmemiz için hangi çözümle karşılaştırdığınızı paylaşırsanız size kısa bir özet çıkaralım.'],
  ['Aylık ücret mi yıllık ücret mi?', 'Ücretlendirme seçilen yapıya göre değişebilir. Size uygun ödeme periyodunu birlikte netleştirebiliriz.'],
  ['Kurulum ücreti var mı?', 'Kurulum koşulları hizmet kapsamına göre değişebilir. Kurulum ihtiyacınızı yazarsanız net bilgi verelim.'],
  ['Hemen bugün başlayabilir miyiz?', 'Evet, uygunluk durumunu kontrol edip hızlıca başlatabiliriz. Gerekli bilgileri paylaşmanız yeterli.'],
  ['Satın almak istiyorum.', 'Harika, satın alma sürecinde yardımcı olalım. Fatura ve iletişim bilgilerinizi paylaşır mısınız?'],
  ['Ödeme linki gönderir misiniz?', 'Tabii, ödeme için gerekli bilgileri netleştirip size yönlendirme yapalım.'],
  ['Kredi kartı ile ödeme yapabilir miyim?', 'Kredi kartı ödeme seçeneğini kontrol edip yardımcı olabiliriz. Paket veya hizmet bilgisini paylaşır mısınız?'],
  ['Havale ile ödeme yapabilir miyim?', 'Havale/EFT için yardımcı olabiliriz. Sipariş veya hizmet detayınızı paylaşmanız yeterli.'],
  ['Teklifinizi mail atar mısınız?', 'Tabii, teklif iletebiliriz. E-posta adresinizi ve istediğiniz kapsamı paylaşır mısınız?'],
  ['Firma için kullanacağız.', 'Firma kullanımı için yardımcı olabiliriz. Ekip sayısı ve kullanım amacınızı yazarsanız doğru yönlendirelim.'],
  ['Kaç kişi kullanabilir?', 'Kullanıcı sayısı seçilen pakete göre değişebilir. Kaç kişilik kullanım düşündüğünüzü paylaşır mısınız?'],
  ['Çoklu WhatsApp hesabı kullanabilir miyiz?', 'Evet, çoklu hesap senaryosunu değerlendirebiliriz. Kaç hatla çalışmak istediğinizi paylaşır mısınız?'],
  ['Mesaj gönderim limiti nedir?', 'Limitler hat, kullanım ve paket yapısına göre değişebilir. Planladığınız günlük mesaj hacmini paylaşır mısınız?'],
  ['Numaram banlanır mı?', 'Güvenli kullanım için hız, içerik ve opt-out kurallarına dikkat ediyoruz. Senaryonuzu paylaşırsanız riskleri azaltacak şekilde yönlendirelim.'],
  ['WhatsApp Business gerekli mi?', 'Kullanım senaryosuna göre değişebilir. Mevcut hattınızın durumunu paylaşırsanız en doğru yolu söyleyelim.'],
  ['CRM entegrasyonu yapıyor musunuz?', 'CRM entegrasyonu için yardımcı olabiliriz. Kullandığınız sistemi yazarsanız uygunluğu kontrol edelim.'],
  ['Excel listem var, yükleyebilir miyim?', 'Evet, liste aktarımı konusunda yardımcı olabiliriz. Dosya formatınızı ve hedefinizi paylaşır mısınız?'],
  ['Kişi listemi nasıl içe aktarırım?', 'Kişi listesini aktarmak için destek olabiliriz. Listenin formatını ve yaklaşık kişi sayısını yazar mısınız?'],
  ['Otomatik cevaplama nasıl çalışıyor?', 'Otomatik cevaplama gelen mesaja göre yanıt hazırlayabilir. Kullanmak istediğiniz senaryoyu paylaşırsanız birlikte ayarlayalım.'],
  ['Gelen mesajları panelden görebilir miyim?', 'Evet, gelen mesajları panelden takip edebilirsiniz. Hangi hesap veya hat için kurmak istediğinizi paylaşır mısınız?'],
  ['Raporlama var mı?', 'Evet, gönderim ve mesaj durumlarını takip edebilirsiniz. Hangi raporlara ihtiyaç duyduğunuzu yazarsanız netleştirelim.'],
  ['Ekibimle birlikte kullanabilir miyim?', 'Ekip kullanımı için yardımcı olabiliriz. Kaç kullanıcı olacağını paylaşırsanız uygun yapıyı önerebiliriz.'],
  ['KVKK açısından uygun mu?', 'KVKK süreçlerinde izinli iletişim ve kayıt yönetimi önemlidir. Kullanım senaryonuzu paylaşırsanız dikkat edilmesi gerekenleri birlikte netleştirelim.'],
  ['İzinli müşterilere mesaj atmak istiyoruz.', 'İzinli müşteri listeleriyle ilerlemek en sağlıklı yöntemdir. Liste yapınızı ve hedefinizi paylaşırsanız yardımcı olalım.'],
  ['Görsel mesaj gönderebilir miyiz?', 'Evet, görsel içerikli gönderimler için destek sağlayabiliriz. Kullanmak istediğiniz görsel ve kampanya amacını paylaşır mısınız?'],
  ['Video gönderebilir miyiz?', 'Video gönderim senaryosunu kontrol edip yönlendirebiliriz. Dosya tipi ve hedef kitlenizi paylaşır mısınız?'],
  ['Link gönderimi yapabilir miyiz?', 'Evet, link içeren mesajlar hazırlanabilir. Kampanya linkinizi ve mesaj amacını paylaşırsanız metni birlikte netleştirelim.'],
  ['Mesaj metnini siz hazırlıyor musunuz?', 'Mesaj metni konusunda yardımcı olabiliriz. Hedef kitle ve kampanya amacını paylaşırsanız uygun metin önerelim.'],
  ['Ürün görseli atabilir misiniz?', 'Tabii, ürün görselleri için yardımcı olalım. Hangi ürünü görmek istediğinizi paylaşır mısınız?'],
  ['Katalog gönderebilir misiniz?', 'Katalog veya ürün seçeneklerini paylaşabiliriz. İlgilendiğiniz ürün grubunu yazmanız yeterli.'],
  ['Ürün detaylarını atar mısınız?', 'Tabii, ürün detaylarını iletelim. Hangi ürünle ilgilendiğinizi paylaşır mısınız?'],
  ['Ürün stokta var mı?', 'Stok durumunu kontrol edebilmemiz için ürün adı, model veya görseli paylaşır mısınız?'],
  ['Bu ürünün başka rengi var mı?', 'Renk seçeneklerini kontrol edelim. İlgilendiğiniz ürün veya model bilgisini paylaşır mısınız?'],
  ['Bu ürünün ölçüsü nedir?', 'Ölçü bilgisi için yardımcı olalım. Hangi ürünün ölçüsünü öğrenmek istediğinizi yazabilir misiniz?'],
  ['Ürünün videosu var mı?', 'Varsa ürün videosu veya ek görselleri paylaşabiliriz. Hangi ürünü görmek istediğinizi yazmanız yeterli.'],
  ['Benzer ürün önerir misiniz?', 'Tabii, benzer seçenekleri önerebiliriz. Bütçe, kullanım amacı veya beğendiğiniz ürünü paylaşır mısınız?'],
  ['Bu üründe kampanya var mı?', 'Bu ürün için güncel kampanya durumunu kontrol edelim. Ürün adını veya görselini iletir misiniz?'],
  ['Ürün fiyat listesini atar mısınız?', 'Fiyat listesi için yardımcı olabiliriz. Hangi ürün grubu için liste istediğinizi paylaşır mısınız?'],
  ['Kampanyayı ne zaman başlatabiliriz?', 'Başlangıç zamanı için yardımcı olabiliriz. Hedef listeniz ve mesaj içeriğiniz hazırsa planlamayı netleştirelim.'],
  ['Bugün gönderim yapabilir miyiz?', 'Bugün gönderim için uygunluğu kontrol edelim. Liste, içerik ve bağlı hat durumunu paylaşır mısınız?'],
  ['Kaç kişiye mesaj atabiliriz?', 'Gönderim adedi kullanılan hat ve güvenli hız ayarlarına göre planlanmalı. Hedef kişi sayısını paylaşır mısınız?'],
  ['Cevap verenleri nasıl takip edeceğim?', 'Cevap verenleri mesajlar ekranından takip edebilirsiniz. İsterseniz dönüşleri sınıflandıracak akışı da birlikte kurabiliriz.'],
  ['Müşteri geri dönüşlerini ayırabiliyor muyuz?', 'Geri dönüşleri takip etmek ve sınıflandırmak için yardımcı olabiliriz. Hangi ayrımları istediğinizi paylaşır mısınız?'],
  ['Kurulum için teknik bilgi gerekiyor mu?', 'Kurulumda sizi yönlendirdiğimiz için teknik bilgi şart değil. Mevcut hattınız ve kullanım hedefiniz yeterli olur.'],
  ['Destek ekibiniz var mı?', 'Evet, destek için yardımcı olabiliriz. Kurulum ya da kullanımda takıldığınız noktayı yazmanız yeterli.'],
  ['Sistemi denemeden karar veremem.', 'Anlıyoruz. Önce ürün/hizmet detaylarını ve örnek kullanım senaryosunu paylaşalım, sonra birlikte netleştirelim.'],
  ['Biraz düşüneceğim.', 'Tabii, ne zaman isterseniz buradayız. Karar verirken netleştirmek istediğiniz bir konu olursa yazabilirsiniz.'],
  ['Şu an ilgilenmiyorum.', 'Anladık, teşekkür ederiz. İleride ihtiyaç olursa buradan bize ulaşabilirsiniz.'],
  ['Beni sonra arayın.', 'Tabii, size uygun gün ve saat aralığını paylaşırsanız o zamanda dönüş yapalım.'],
  ['Yetkili biriyle görüşebilir miyim?', 'Elbette, sizi doğru kişiye yönlendirelim. Konu başlığını ve iletişim bilginizi paylaşır mısınız?'],
  ['Detaylı bilgi dokümanı var mı?', 'Detaylı bilgi paylaşabiliriz. Hangi konu başlığını istediğinizi ve e-posta adresinizi iletir misiniz?'],
  ['Referans müşterileriniz var mı?', 'Referans ve kullanım örnekleri konusunda yardımcı olabiliriz. Sektörünüzü paylaşırsanız daha alakalı bilgi verebiliriz.'],
  ['Hangi sektörler için uygun?', 'Birçok sektör için uyarlanabilir. Sektörünüzü ve iletişim hedefinizi yazarsanız size özel değerlendirelim.'],
  ['E-ticaret için uygun mu?', 'E-ticaret senaryoları için uygundur. Sipariş, kampanya veya müşteri desteği hedefinizi paylaşır mısınız?'],
  ['Ajans olarak müşterilerimiz için kullanabilir miyiz?', 'Ajans kullanımı için uygun modeli birlikte değerlendirebiliriz. Kaç müşteri ve kaç hat planladığınızı paylaşır mısınız?'],
  ['Bayilik veya reseller var mı?', 'İş ortaklığı seçeneklerini değerlendirebiliriz. Çalışma modelinizi ve hedefinizi paylaşır mısınız?'],
  ['Yurt dışına mesaj gönderebilir miyiz?', 'Yurt dışı gönderim senaryosunu kontrol etmek gerekir. Hedef ülke ve mesaj hacmini paylaşır mısınız?'],
  ['Türkçe dışında mesaj atabilir miyiz?', 'Evet, farklı dilde mesaj içerikleri hazırlanabilir. Hedef dili ve mesaj amacını paylaşmanız yeterli.'],
  ['Mesaj kişiye özel gidebilir mi?', 'Evet, kişiselleştirme yapılabilir. Kullanmak istediğiniz alanları ve liste formatını paylaşır mısınız?'],
  ['İsimle hitap edebilir miyiz?', 'Evet, listede isim alanı varsa mesajları kişiye özel hazırlayabiliriz. Liste yapınızı kontrol edelim.'],
  ['Yanıt gelirse otomatik cevap versin istiyorum.', 'Bunu kurabiliriz. Hangi gelen mesajlara nasıl cevap verilmesini istediğinizi birlikte tanımlayalım.'],
  ['Sadece ilgilenenlere dönüş yapmak istiyorum.', 'Cevap verenleri ayırıp ilgilenenlere dönüş akışı kurabiliriz. Nasıl sınıflandırmak istediğinizi paylaşır mısınız?'],
  ['Randevu almak isteyenleri ayıklayabilir miyiz?', 'Evet, randevu talebi olanları takip edecek bir akış kurgulayabiliriz. İstediğiniz kriterleri paylaşın.'],
  ['Olumsuz dönüşleri ayırabilir miyiz?', 'Evet, olumsuz dönüşleri ayrı izlemek mümkün. İsterseniz bu cevaplara uygun kısa yanıtları da hazırlayalım.'],
  ['Yanlış numaraları temizleyebilir miyiz?', 'Liste temizliği için yardımcı olabiliriz. Numara formatı ve doğrulama ihtiyacınızı paylaşır mısınız?'],
  ['Panel mobilde çalışıyor mu?', 'Evet, paneli mobilde kullanabilirsiniz. Kullanmak istediğiniz ekran veya iş akışını paylaşırsanız yönlendirelim.'],
  ['Kaç dakikada kurulur?', 'Kurulum süresi hesap ve kullanım senaryosuna göre değişebilir. Mevcut durumunuzu yazarsanız tahmini süre paylaşalım.'],
  ['Sözleşmeyi iptal edebilir miyim?', 'İptal koşulları seçilen hizmete göre değişebilir. Mevcut paket veya teklif bilgisini paylaşırsanız netleştirelim.'],
  ['Verilerim güvende mi?', 'Veri güvenliği bizim için önemli. Hangi veri ve kullanım senaryosu için sorduğunuzu paylaşırsanız detaylı bilgi verelim.'],
  ['Panelde kimler mesajları görebilir?', 'Erişimler ekip ve yetki yapısına göre yönetilebilir. Kaç kullanıcı ve rol istediğinizi paylaşır mısınız?'],
]

for (const [sample, baseReply] of salesCatalog) {
  catalog.push({
    sample,
    suggestions: [
      ['KISA & NET', baseReply],
      ['SAMIMI', `${baseReply} İsterseniz hemen buradan ilerleyebiliriz.`],
      ['YONLENDIRICI', `${baseReply} Size net dönüş yapabilmemiz için kısa bir detay daha paylaşır mısınız?`],
    ],
  })
}

function suggestionsForIncoming(text) {
  const normalized = normalizeForLibrary(text)
  if (normalized.length < 4 || normalized.length > 500) return null

  if (/\b(fiyat|ücret|ucret|kaç para|kac para|ne kadar|paket|tarife|teklif)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Fiyat bilgisi için yardımcı olalım. İhtiyacınızı ve kullanım hacminizi paylaşır mısınız?' },
      { label: 'SAMIMI', text: 'Elbette, size uygun seçeneği birlikte netleştirelim. Nasıl bir kullanım düşündüğünüzü yazmanız yeterli.' },
      { label: 'YONLENDIRICI', text: 'Net fiyat paylaşabilmemiz için paket ihtiyacı, kişi sayısı veya mesaj hacmi bilgisini iletebilir misiniz?' },
    ]
  }
  if (/\b(kampanya|indirim|promosyon|fırsat|firsat)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Güncel kampanya bilgisini kontrol edip paylaşalım. Hangi ürün veya hizmetle ilgileniyorsunuz?' },
      { label: 'SAMIMI', text: 'Tabii, kampanya tarafında yardımcı oluruz. İlgilendiğiniz alanı yazarsanız en uygun seçeneği iletelim.' },
      { label: 'YONLENDIRICI', text: 'Kampanyayı doğru eşleştirmek için ihtiyacınızı, kullanım adedini veya hedefinizi paylaşabilirsiniz.' },
    ]
  }
  if (/\b(demo|deneme|test|görmek|gormek|incelemek|görsel|gorsel|katalog|video|stok|renk|ölçü|olcu|model)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Ürün görseli ve detayları için yardımcı olalım. Hangi ürünle ilgilendiğinizi paylaşır mısınız?' },
      { label: 'SAMIMI', text: 'Memnuniyetle, ilgilendiğiniz ürünü yazarsanız görsel ve detayları paylaşalım.' },
      { label: 'YONLENDIRICI', text: 'Doğru seçenekleri gönderebilmemiz için ürün adı, model, renk veya kullanım amacınızı iletebilirsiniz.' },
    ]
  }
  if (/\b(whatsapp|hat|numara|ban|business|qr|bağla|bagla|entegrasyon)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'WhatsApp tarafında yardımcı olabiliriz. Mevcut hattınızın durumunu ve kullanım senaryonuzu paylaşır mısınız?' },
      { label: 'SAMIMI', text: 'Tabii, birlikte kuralım. Hattı nasıl kullanmak istediğinizi yazarsanız en doğru yolu söyleyelim.' },
      { label: 'YONLENDIRICI', text: 'Doğru yönlendirme için hat sayısı, günlük mesaj hacmi ve otomatik cevap ihtiyacınızı iletebilirsiniz.' },
    ]
  }
  if (/\b(kurulum|başla|basla|nasıl|nasil|kullanım|kullanim|ayar)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Kurulumda adım adım yardımcı oluyoruz. Başlamak için mevcut durumunuzu paylaşmanız yeterli.' },
      { label: 'SAMIMI', text: 'Merak etmeyin, kurulumu birlikte tamamlarız. Hangi aşamada olduğunuzu yazarsanız yönlendirelim.' },
      { label: 'YONLENDIRICI', text: 'Başlangıç için hattınız, hedef listeniz ve göndermek istediğiniz mesaj tipiyle ilgili kısa bilgi paylaşabilirsiniz.' },
    ]
  }
  if (/\b(ödeme|odeme|kart|havale|eft|fatura|satın|satin|almak)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Ödeme ve fatura sürecinde yardımcı olabiliriz. Firma ve paket bilginizi paylaşır mısınız?' },
      { label: 'SAMIMI', text: 'Tabii, ödeme tarafını birlikte netleştirelim. Size uygun yöntemi yazmanız yeterli.' },
      { label: 'YONLENDIRICI', text: 'İlerleyebilmemiz için fatura bilgileri, tercih edilen ödeme yöntemi ve seçilen hizmeti iletebilirsiniz.' },
    ]
  }
  if (/\b(ara|arayın|arayin|telefon|görüş|gorus|randevu|toplantı|toplanti)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Tabii, görüşme için uygun gün ve saat aralığınızı paylaşır mısınız?' },
      { label: 'SAMIMI', text: 'Elbette, size uygun zamanda dönüş yapalım. Uygun saat aralığınızı yazmanız yeterli.' },
      { label: 'YONLENDIRICI', text: 'Görüşme planlamak için konu başlığını, telefon bilginizi ve uygun zamanınızı iletebilirsiniz.' },
    ]
  }
  if (/\b(teşekkür|tesekkur|tamam|olur|sağol|sagol|kolay gelsin)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Rica ederiz, size de kolay gelsin.' },
      { label: 'SAMIMI', text: 'Biz teşekkür ederiz. Başka bir ihtiyacınız olursa her zaman yazabilirsiniz.' },
      { label: 'YONLENDIRICI', text: 'Rica ederiz. İhtiyacınız olduğunda buradan bize ulaşabilirsiniz.' },
    ]
  }
  if (/\b(ilgilenmiyorum|istemiyorum|rahatsız|rahatsiz|sil|çık|cik|iptal)\b/u.test(normalized)) {
    return [
      { label: 'KISA & NET', text: 'Anladık, bilgilendirme için teşekkür ederiz. Size tekrar rahatsızlık vermeyelim.' },
      { label: 'SAMIMI', text: 'Tabii, anlayışınız için teşekkür ederiz. Talebinizi dikkate alıyoruz.' },
      { label: 'YONLENDIRICI', text: 'Talebinizi not aldık. İletişim tercihinizi güncelleyerek size tekrar dönüş yapmayacağız.' },
    ]
  }

  return [
    { label: 'KISA & NET', text: 'Mesajınızı aldık, yardımcı olalım. İhtiyacınızı biraz daha net paylaşır mısınız?' },
    { label: 'SAMIMI', text: 'Tabii, memnuniyetle yardımcı oluruz. Kısaca ne yapmak istediğinizi yazarsanız hemen bakalım.' },
    { label: 'YONLENDIRICI', text: 'Size doğru bilgi verebilmemiz için konu, kullanım amacı veya talep detayını paylaşabilirsiniz.' },
  ]
}

async function upsertLibraryBatch(client, rows) {
  const deduped = [
    ...new Map(
      rows.map((row) => [`${row.orgId}:${row.messageFingerprint}:${row.contextFingerprint}`, row]),
    ).values(),
  ]
  const chunkSize = 100
  let written = 0
  for (let start = 0; start < deduped.length; start += chunkSize) {
    const chunk = deduped.slice(start, start + chunkSize)
    const values = []
    const placeholders = chunk.map((row, index) => {
      const offset = index * 5
      values.push(row.orgId, row.messageFingerprint, row.contextFingerprint, row.incomingSample, JSON.stringify(row.suggestions))
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}::jsonb, 'import', 0, null, now())`
    })

    await client.query(
      `insert into public.ai_reply_suggestion_library (
        org_id, message_fingerprint, context_fingerprint, incoming_sample,
        suggestions, source, generated_count, last_used_at, updated_at
      )
      values ${placeholders.join(', ')}
      on conflict (org_id, message_fingerprint, context_fingerprint)
      do update set
        incoming_sample = excluded.incoming_sample,
        suggestions = excluded.suggestions,
        source = 'import',
        updated_at = now()`,
      values,
    )
    written += chunk.length
  }
  return written
}

async function main() {
  const root = process.cwd()
  const env = { ...loadEnv(path.join(root, 'apps', 'wa-service', '.env')), ...process.env }
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL bulunamadi')

  const client = new Client({
    connectionString: env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    application_name: 'seed_ai_reply_library',
  })

  await client.connect()
  const orgs = await client.query(`
    select o.id, o.name,
           bk.name as kit_name,
           bk.tone,
           coalesce(
             array_remove(array_agg(op.name order by op.created_at desc) filter (where op.id is not null), null),
             '{}'
           ) as products
      from public.organizations o
      left join public.brand_kits bk on bk.org_id = o.id and bk.is_default = true
      left join public.org_products op on op.org_id = o.id and op.is_active = true
     group by o.id, o.name, bk.name, bk.tone
     order by o.created_at asc
  `)

  let insertedOrUpdated = 0
  let learnedFromInbound = 0
  for (const org of orgs.rows) {
    let companyContext = org.name
    if (org.kit_name && org.kit_name !== org.name) companyContext += ` (${org.kit_name})`
    const products = Array.isArray(org.products) ? org.products.slice(0, 6) : []
    if (products.length > 0) companyContext += `. Ürünler/Hizmetler: ${products.join(', ')}`
    const tone = org.tone || 'Kurumsal, nazik, yardımsever ve samimi'
    const rowsToUpsert = []

    for (const item of catalog) {
      const historyForCache = shouldHistoryAffectCache(item.sample) ? '' : ''
      rowsToUpsert.push({
        orgId: org.id,
        messageFingerprint: fingerprint(item.sample),
        contextFingerprint: fingerprint(`${companyContext}\n${tone}\n${historyForCache}`),
        incomingSample: item.sample,
        suggestions: item.suggestions.map(([label, text]) => ({ label, text })),
      })
    }

    const inbound = await client.query(
      `select distinct on (left(body, 500)) left(body, 500) as body
         from public.message_log
        where org_id = $1
          and direction = 'in'
          and message_type = 'text'
          and body is not null
          and length(btrim(body)) between 4 and 500
        order by left(body, 500), id desc
        limit 250`,
      [org.id],
    )

    for (const row of inbound.rows) {
      const sample = String(row.body || '').trim()
      const suggestions = suggestionsForIncoming(sample)
      if (!suggestions) continue
      const historyForCache = shouldHistoryAffectCache(sample) ? '' : ''
      rowsToUpsert.push({
        orgId: org.id,
        messageFingerprint: fingerprint(sample),
        contextFingerprint: fingerprint(`${companyContext}\n${tone}\n${historyForCache}`),
        incomingSample: sample,
        suggestions,
      })
      learnedFromInbound += 1
    }

    insertedOrUpdated += await upsertLibraryBatch(client, rowsToUpsert)
  }

  await client.end()
  console.log(JSON.stringify({
    orgs: orgs.rowCount,
    templates: catalog.length,
    learned_from_inbound: learnedFromInbound,
    inserted_or_updated: insertedOrUpdated,
  }))
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
