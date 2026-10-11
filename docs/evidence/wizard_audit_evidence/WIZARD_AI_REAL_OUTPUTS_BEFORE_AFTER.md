# WIZARD AI REAL OUTPUTS: BEFORE VS AFTER COMPARISON REPORT

**Tarih:** 10 Ekim 2026  
**Test Ortamı:** OmniStudio Gateway (`167.233.201.31:3456`)  
**Amaç:** Mesajify'de sahte AI şablon hissinin, marka adı değiştirilerek üretilen kopya metinlerin ve prompt bağlam sızıntılarının nasıl ortadan kaldırıldığını; "ÖNCE" ve "SONRA" çıktılarını yan yana koyarak kanıtlamak.

---

## 1. GÖRSEL WIZARD: FİKİR ÖNERİSİ ÇİPLERİ (`/api/icerik/fikir`)

### 1.1. Bofe Tarım (Tarım / Makine — 16L Akülü Pompa)

| Çip Kategorisi | ÖNCE (Template Fallback — Hatalı Durum) | SONRA (Gerçek OmniStudio GPT — Yeni Durum) | Kalite Farkı |
| :--- | :--- | :--- | :--- |
| **İndirim Kampanyası** | *"Bofe Tarım için indirim kampanyası odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım."* | *"Yeşil bir tarlanın ortasında, 16L açık mavi deposuyla Bofe Akülü Sırt İlaçlama Pompası ön planda; güçlü bataryası, ayarlanabilir pirinç nozulu ve ergonomik askısı zarif detaylarla vurgulanıyor. Görselin odağında: 'Tarlada İşiniz Kolay, Bofe ile Yükünüz Hafif!'"* | **Gece ile gündüz.** Sabit 1 satırlık jenerik cümle yerine; gerçek ürün parçalarını (pirinç nozul, 16L depo, ergonomik askı) sahneleyen gerçek reklam ajansı vizyonu. |
| **Yeni Ürün** | *"Bofe Tarım için yeni ürün odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım."* | *"Güneş ışığıyla aydınlanan yemyeşil bir tarlada, açık mavi 16L deposuyla Bofe Akülü Sırt İlaçlama Pompası ön planda; lityum-iyon bataryası, ayarlanabilir pirinç nozulu ve ergonomik askısı detaylarda vurgulanıyor. 'Tarlada Yeni Güç: Bofe 16L!'"* | Sektörel ışıklandırma, sahne kompozisyonu ve özgün reklam manşeti. |
| **Sezon Kampanyası** | *"Bofe Tarım için sezon kampanyası odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım."* | *"Yeni sezonun canlı yeşil tarlaları arasında, açık mavi 16L deposuyla Bofe Akülü Sırt İlaçlama Pompası öne çıkıyor; güçlü lityum-iyon bataryası, ayarlanabilir pirinç nozulu ve ergonomik askısı yakın plan detaylarla vurgulanıyor. 'Sezon Başlasın, Bofe İş Başında!'"* | Tarımsal sezona özel vizyonel görsel brief. |

---

### 1.2. Maydonoz Döner (Restoran / Gıda — Özel Soslu Hatay Dürüm)

| Çip Kategorisi | ÖNCE (Eski Şablon Üretilseydi) | SONRA (Gerçek OmniStudio GPT) | Kalite Farkı |
| :--- | :--- | :--- | :--- |
| **İndirim Kampanyası** | *"Maydonoz Döner için indirim kampanyası odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım."* | *"Altın renginde çıtır tereyağlı lavaşa sarılmış Hatay usulü yaprak döner, üzerinden süzülen domates sosuyla iştah açıcı bir yakın planda sunulur. Sıcak kırmızı ve turuncu tonların hâkim olduğu görselde 'Sosu Bol, Keyfi Büyük! İndirim Maydonoz Döner’de!' mesajı öne çıkar."* | **Tamamen iştah açıcı.** Sıcak renk tonları, çıtır lavaş, tereyağı ve domates sosu detaylarıyla gıda reklamı standardında. |
| **Yeni Ürün** | *"Maydonoz Döner için yeni ürün odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım."* | *"Tereyağlı çıtır lavaşın arasından taşan Hatay usulü yaprak döner ve iştah açan domates sosu, sıcak bir atmosferde yakın plan sergilenir. Maydonoz Döner’in yeni lezzeti, 'Çıtır Lavaş, Bol Sos, Tam Hatay Havası!' sloganıyla sahneye çıkar."* | Özgün ve markaya has lezzet sloganı. |
| **Sezon Kampanyası** | *"Maydonoz Döner için sezon kampanyası odaklı..."* | *"Sonbaharın sıcak tonları arasında, tereyağlı çıtır lavaştan yükselen buhar, Hatay usulü yaprak döner ve nefis domates sosuyla buluşur. Maydonoz Döner’in sezon kampanyası, 'Havalar Serinlesin, Dürüm Keyfi Isınsın!' sloganıyla iştahları kabartır."* | Sıcaklık ve mevsim kontrastı üzerinden kurgulanmış profesyonel reklam fikri. |

---

## 2. KAMPANYA WIZARD: METİN İYİLEŞTİRME (REWRITE) VE BAĞLAM SIZINTISI

### 2.1. İmla Düzeltme (`fix_grammar`) — Bağlam Sızıntısının Önlenmesi

* **Kullanıcı Girdisi:** `"degerli uretici bofe 16L akulu pompa 2450 tl yerine 1850 tl dir siparis icin arayiniz"`
* **Oturumdaki Referans Brief:** *"Bu hafta sonu zeytinyağında %25 indirim var."*

| Durum | Üretilen Metin | İnceleme ve Değerlendirme |
| :--- | :--- | :--- |
| **ÖNCE (Eski Prompt Mantığı)** | *"Değerli müşterimiz, Bofe Tarım’da **bu hafta sonuna özel** akülü pompada 1.850 TL indirim fırsatı başladı! Mağazamıza bekliyoruz."* | **FAIL (Bağlam Sızıntısı):** Orijinal mesajda olmayan `"bu hafta sonu"` ifadesi arka plandaki brieften sızdı. |
| **SONRA (İzole Edilmiş Prompt)** | *"Değerli üreticimiz, Bofe 16L Akülü Sırt Pompası 2.450 TL yerine 1.850 TL'dir. Sipariş için arayınız."* | **PASS:** Yalnızca imla ve büyük/küçük harf düzeltildi; hiçbir uydurma zaman veya sızıntı eklenmedi. Ticari fiyatlar harfiyen korundu. |

---

### 2.2. Emojileri Temizle (`remove_emoji`)

* **Kullanıcı Girdisi:** `"🌯🔥 Enfes tereyağlı çıtır lavaşlı Hatay Dürüm 195 TL yerine 165 TL! 🛵 Hemen sipariş verin! 📞 0224 451 00 20"`

| Durum | Üretilen Metin | İnceleme |
| :--- | :--- | :--- |
| **ÖNCE** | Bazen emojileri tamamen silemeyip araya `✨` veya `👉` bırakabiliyordu. | Tutarsız |
| **SONRA** | *"Enfes tereyağlı çıtır lavaşlı Hatay Dürüm 195 TL yerine 165 TL!\n\nHemen sipariş verin!\n\n0224 451 00 20"* | **PASS:** Sıfır emoji, 195 TL ve 165 TL fiyatları ile telefon eksiksiz korundu. |

---

## 3. CREATIVE STUDIO: AI REKLAM PLANI VE "FARKLİ ÖNER" ÇEŞİTLİLİĞİ

Kullanıcı "↻ Farklı Öner" butonuna bastığında sistem sadece 1-2 kelime mi değiştiriyor, yoksa gerçekten farklı bir pazarlama açısı mı sunuyor?

### Bofe Tarım — 16L Akülü Pompa
* **Plan 1 (Standart Plan — Fiyat ve Güç Açısı):**  
  - **Başlık:** *"İlaçlamada Güç, Fiyatta Avantaj!"*  
  - **Alt Metin:** *"Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası 16L ile geniş alanlarda zahmetsiz ve pratik ilaçlama yapın."*  
  - **CTA:** *"Avantajı Yakala"*
* **Plan 2 (Farklı Öner — Ergonomi ve Kontrol Açısı):**  
  - **Başlık:** *"Sırtınızda Rahatlık, Elinizde Kontrol!"*  
  - **Alt Metin:** *"Ayarlanabilir nozul ve hafif tasarımıyla tarla ve bahçe işlerinizde yorulmadan maksimum verim sağlayın."*  
  - **CTA:** *"Hemen İncele"*
* **Değerlendirme:** **GERÇEK PAZARLAMA ÇEŞİTLİLİĞİ.** Birinci plan fiyat avantajı ve depo kapasitesine odaklanırken, ikinci plan sırt askısı ergonomisi ve yorulmadan ilaçlama yapma rahatlığına odaklanmıştır.

### Mesajify — B2B SaaS
* **Plan 1 (Büyüme & Müşteri Edinme Açısı):**  
  - **Başlık:** *"Yeni Müşteriler Bir Mesaj Uzağınızda"*  
  - **Alt Metin:** *"Mesajify ile civarınızdaki işletmelere doğrudan WhatsApp üzerinden ulaşın, anında sıcak satış fırsatları yakalayın."*  
* **Plan 2 (Farklı Öner — Operasyonel Verimlilik Açısı):**  
  - **Başlık:** *"Hatlar Çoğalsın, İş Yükünüz Değil"*  
  - **Alt Metin:** *"Tüm WhatsApp hatlarınızı tek ekrandan yönetin; gelen talepleri ekibinizle paylaşarak müşteri yanıt sürenizi kısaltın."*  
* **Değerlendirme:** **GERÇEK PAZARLAMA ÇEŞİTLİLİĞİ.** İki plan birbirinin kelime tekrarı değildir; biri lead generation / yeni müşteri bulma, diğeri ise ortak gelen kutusu / operasyonel tasarruf argümanını işlemektedir.
