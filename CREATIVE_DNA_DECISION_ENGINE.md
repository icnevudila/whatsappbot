# CREATIVE DNA DECISION ENGINE — MULTI-DIMENSIONAL RECOMMENDATION SYSTEM
**Mesajify Creative Intelligence & Decision Systems**  
*Document Version: 4.0.0 — Final Quality Cleanup*  
*Date: 2026-10-11*  
*Target Environment: OmniStudio Wizard Integration | Veo 3.1 Fast*

---

## 1. Giriş ve Temel Çalışma İlkesi

Mesajify Creative DNA Karar Motoru'nun temel amacı, **kullanıcıyı karmaşık promptlar yazma zahmetinden tamamen kurtarmaktır**.

Kullanıcı yalnızca işletmesini, ürününü ve kampanya hedefini seçer; sistem işletmenin sektörüne, ürünün gerçek geometrisine ve geçmiş kampanyalarına göre **3 farklı stratejik reklam yaklaşımı** ve her yaklaşım için **3 farklı kanca (hook) alternatifi** sunar.

---

## 2. Karar Motoru Girdileri & Heuristik Puanlama

### 2.1 Girdi Parametreleri
1. **İşletme Sektörü:** Tarım, İnşaat, Restoran, Çiçekçilik, SaaS, Sanayi.
2. **Kanonik Ürün & Geometri:** `liquid_spray` (Sıvı/Püskürtme), `solid_block` (Katı/Blok), `food_culinary` (Gıda/Yemek), `soft_botanical` (Çiçek/Bitki), `digital_ui` (Yazılım Arayüzü), `heavy_machinery` (Ağır Makine).
3. **Marka Tonu:** Usta/Pratik, Kurumsal/Mühendislik, Sıcak/İştah Açıcı, Zarif, Modern/Teknolojik.
4. **Hedef Kitle:** Çiftçi/Üretici, Müteahhit/Usta, Tüketici/Aile, Ofis Yöneticisi/Patron.
5. **Reklam Amacı:** WhatsApp Sipariş, B2B Fiyat Teklifi, Masa Rezervasyonu, Ürün Tanıtımı.
6. **Doğrulanmış Ürün Özellikleri:** Yalnızca katalogda kayıtlı gerçek parametreler.
7. **Geçmiş Kampanya Hafızası:** Son kullanılan modeller ve sıklıkları.

### 2.2 Başlangıç Heuristiği Puanlaması (Initial Heuristic)

> **Metodolojik Not:** Aşağıdaki ağırlık katsayıları bilimsel olarak kanıtlanmış mutlak yasalar değildir. Sistem açılışı için belirlenmiş **bir başlangıç heuristiğidir (initial heuristic)**. Gerçek reklam tıklama ve dönüşüm sonuçları toplandıkça algoritmik olarak kalibre edilecektir.

$$S_m = (0.35 \cdot P_m + 0.25 \cdot A_m + 0.25 \cdot G_m) \cdot D_m$$

* $P_m$ (**Ürün Geometrisi Uyumu - %35**): Ürünün fiziksel formunun modele uygunluğu (ör. sıvı püskürtme için `Ürün Kullanımı` yüksek, soyut hikaye düşük).
* $A_m$ (**Kitle & Ton Uyumu - %25**): Hedef kitlenin satın alma refleksi.
* $G_m$ (**Kampanya Hedefi Uyumu - %25**): WhatsApp doğrudan siparişine dönük uygunluk.
* $D_m$ (**Çeşitlilik & Yorgunluk Çarpanı - %15**):
  - Model son kampanyada kullanıldıysa: $\times 0.70$ (hafif ceza)
  - Model son 2 kampanyada kullanıldıysa: $\times 0.85$
  - Model yeni ise veya uzun süredir kullanılmadıysa: $\times 1.15$ (bonus)
  - *Kural:* Ceza puanı en uygun modeli zorla elemez; alternatiflerin öne çıkmasını sağlar.

---

## 3. Üç Seçenekli Strateji ve Kanca Alternatifleri

Sistem kullanıcıya her zaman 3 ana yaklaşım ve her biri için seçilebilir 3 kanca sunar:

---

### 3.1 BOFE (Akülü Sırt Pompası)

#### YAKLAŞIM 1: Ürün Kullanımı (Ergonomik Akülü Püskürtme)
* **Neden Seçildi?** Çiftçi aletin sahada nasıl çalıştığını (affordance) doğrudan görmek ister.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Makro Sis Patlaması):* Pirinç nozülden fışkıran yoğun su sisi bulutu ve tok akış sesi.
  - *Kanca 2 (Serada İlerleme):* Sırtta hafif açık mavi depo ile bitki sıralarında dik ve rahat yürüyüş.
  - *Kanca 3 (Yaprak Nüfuzu):* Sis bulutunun yaprağın hem üstüne hem altına eşit sarılması.

#### YAKLAŞIM 2: Sorun ve Çözüm (Manuel Kol Yorulması vs. Tek Tuş Akülü Rahatlık)
* **Neden Seçildi?** Hedef kitlenin en büyük fiziksel sürtünmesi sırt ağrısı ve yorgunluktur.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Duraksayan Kol):* Mekanik kolu basarken yorulan ve duraksayan el hareketi.
  - *Kanca 2 (Zaman Kaybı):* Sera ortasında durup dinlenmek zorunda kalan çiftçi gerilimi.
  - *Kanca 3 (Tek Parmakla Çalışma):* Parmak mandalına tek dokunuşla zahmetsiz başlayan akış.

#### YAKLAŞIM 3: Kampanya Fırsatı (Eksiksiz Kutu İçeriği & Sezon Hazırlığı)
* **Neden Seçildi?** Sezon başında çiftçi tüm parçaları hazır, eksiksiz bir teslimat ister.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Kutu Açılışı):* Bofe kutusundan çıkan pırıl pırıl 16L açık mavi depo gövdesi.
  - *Kanca 2 (Aksesuar Dizilimi):* Pirinç nozul seti, teleskopik boru ve şarj aletinin düzenli sergisi.
  - *Kanca 3 (Çalışmaya Hazır):* Borunun tek klikle depoya takılıp anında hazır olması.

---

### 3.2 AYVAZOĞLU İNŞAAT (Delikli Kil Tuğla)

#### YAKLAŞIM 1: Ürün Detayı (Fırınlanmış Kil Dokusu & Dikey Gözenekler)
* **Neden Seçildi?** Kaliteli tuğla ustaya harç tasarrufu ve sağlamlık hissi verir.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Kiremit Rengi Makro):* Fırınlanmış kilin pürüzsüz hatları ve dikey delik simetrisi.
  - *Kanca 2 (Tok Malzeme Sesi):* İki tuğlanın birbirine hafif dokunuşundaki sağlam tını.
  - *Kanca 3 (Usta Eli Kontrolü):* Şantiye şefinin parmaklarıyla düzgün kenarları yoklaması.

#### YAKLAŞIM 2: Şantiye Kanıtı (Şantiyede Duvar Örümü & Düzgün Hat)
* **Neden Seçildi?** Şantiyede harçla duvara otururken görmek en somut kanıttır.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Mala Hareketi):* Ustanın harcı serip tuğlayı tek vuruşta yerine oturtması.
  - *Kanca 2 (Terazi Dengesi):* Su terazisinin duvara yaslandığında dengeli merkezde duruşu.
  - *Kanca 3 (Yükselen Duvar):* Milimetrik düzlükte yükselen sağlam duvar hattı.

#### YAKLAŞIM 3: Tedarik / Kampanya Fırsatı (Fabrikadan Şantiyeye Sevk & Kapıya Teslim)
* **Neden Seçildi?** Müteahhit için doğrudan fabrikadan teslimat hızı ve toptan fiyat esastır.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Vinç İndirme):* Paletlerin şantiye sahasına güvenle indirilmesi anı.
  - *Kanca 2 (Muntazam Sıra):* Şantiyede hazır bekleyen muntazam ambalajlı palet dizilimi.
  - *Kanca 3 (Doğrudan Sevk):* Fabrikadan kapıya teslim kurumsal nakliye güvencesi.

---

### 3.3 MESAJIFY (WhatsApp Tanıtım & Kitle Platformu)

#### YAKLAŞIM 1: Gerçek Arayüz Demosu (Akıllı Hat Rotalama Canlı Akışı)
* **Neden Seçildi?** Yazılım alıcısı gerçek panel ekranını gördüğünde ikna olur.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Tek Tıkla Başlatma):* İmlecin "Gönder" butonuna basması ve yeşil dalga kancası.
  - *Kanca 2 (Dengeli Hat Dağılımı):* Çoklu hatlar arasında yükün saniyeler içinde paylaştırılması.
  - *Kanca 3 (Canlı Teslimat Sayacı):* Doğrulanan listenin ekranda başarıyla ilerlemesi.

#### YAKLAŞIM 2: Sorun ve Çözüm (Manuel Mesajlaşma Zorluğu vs. Kontrollü Gönderim)
* **Neden Seçildi?** Tek numaradan yüzlerce mesaj atmaya çalışırken yaşanan operasyonel kargaşa.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Karışan Mesajlar):* Telefonda müşteri yanıtlarının karışması ve gecikme stresi.
  - *Kanca 2 (Gelen Kutusu Kaosu):* Farklı telefonlara dağılmış mesajları toplayamama derdi.
  - *Kanca 3 (Ortak Gelen Kutusu):* Tüm müşteri yanıtlarının tek ekranda toplanıp rahatlama anı.

#### YAKLAŞIM 3: İş Akışı Kolaylığı (Toplu Liste Yönetimi & Gönderim Görünürlüğü)
* **Neden Seçildi?** Liste temizliği ve kampanya raporlaması pazarlamacının işini kolaylaştırır.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Liste Doğrulama):* Hatalı numaraların otomatik ayıklanıp temiz listenin hazırlanması.
  - *Kanca 2 (Gönderim İlerlemesi):* Kampanya kontrol merkezinde anlık durum grafiği.
  - *Kanca 3 (Raporlama Rahatlığı):* Kampanya bitiminde tek bakışta tüm özetin görülmesi.

---

### 3.4 USTA DÖNER (Gıda & Restoran — Onaylı Test Markası)

#### YAKLAŞIM 1: Duyusal Kanca / Ürün Kullanımı (Izgarada Tereyağlı Lavaş & Dürüm)
* **Neden Seçildi?** Gıdada ilk 2 saniyelik cızırtı ve sos buharı doğrudan iştah açar.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Izgara Cızırtısı):* Sıcak ızgaraya değen tereyağlı lavaşın yoğun cızırtısı.
  - *Kanca 2 (Buhar & Sos):* Sıcak domates sosunun döner etinin üzerine dökülüş anı.
  - *Kanca 3 (Dürüm Kesimi):* İkiye kesilen dürümün içindeki kat kat et dokusunun parıltısı.

#### YAKLAŞIM 2: Hazırlık / Mutfak Zanaatı (Döner Tezgahında Yaprak Kesim)
* **Neden Seçildi?** Mutfaktaki temizliği ve taze kesimi görmek lezzet güvenini artırır.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Bıçak Hareketi):* Ustanın döner bıçağıyla yaprak inceliğinde et kesmesi.
  - *Kanca 2 (Nar Gibi Döner):* Ateşte dinlenerek pişen Hatay usulü etin kızarma dokusu.
  - *Kanca 3 (Lavaş Sarımı):* Soslu etlerin taze lavaşa ustalıkla sarılma anı.

#### YAKLAŞIM 3: Masada Deneyim / Dürüm Lezzeti (Çıtır Lavaş & Doyurucu Porsiyon)
* **Neden Seçildi?** Masadaki doyuruculuk ve keyif anı sipariş kararını hızlandırır.
* **Kanca Alternatifleri (Seçilebilir):**
  - *Kanca 1 (Masaya Servis):* Dumanı üstünde servis edilen tabağa doğru hızlı yaklaşım.
  - *Kanca 2 (İlk Isırık Memnuniyeti):* Çıtır dürümden ilk lokmayı alan müşterinin tebessümü.
  - *Kanca 3 (Zengin Sofra):* Dürüm, patates ve soğuk içeceğin eksiksiz menü görüntüsü.

---

## 4. Kullanıcı Arayüzü Entegrasyon Sözleşmesi (UI Contract)

Kullanıcı Sihirbazda seçim yaparken aşağıdaki temiz veri akışı sağlanır:

```typescript
export interface CreativeDNAOption {
  approachId: 'product_usage' | 'problem_solution' | 'campaign_offer';
  approachTitle: string; // ör. "Ürün Kullanımı"
  approachRationale: string;
  hooks: {
    hookId: string;
    hookTitle: string; // ör. "Makro Sis Patlaması"
    hookDescription: string;
    firstTwoSecondsVisual: string;
  }[];
}
```

Kullanıcı 1 yaklaşım ve 1 kanca seçtiğinde, Veo 3.1 Fast prompt derleyicisi bu seçimi otomatik olarak 8s + 2s dondurulmuş motoruna dönüştürür.

---

*Belge Sonu — Mesajify Creative DNA Decision Engine.*
