# CLAIMS AND BENCHMARK AUDIT — METHODOLOGICAL RIGOR REPORT
**Mesajify Research & Video Engineering Group**  
*Document Version: 2.0.0 — Production Verification Audit*  
*Date: 2026-10-11*  
*Repository Status: Working Directory: `c:\Users\TP2\Documents\whatsapp` | Branch: `fix/wizard-brand-product-strict-enforcement` | Commit: `a547208`*

---

## 1. Denetim Amacı ve Metodolojik Düzeltmeler

Bu denetim raporu, önceki araştırma taslağında yer alan iddiaları, sektör metriklerini ve eşik değerlerini bağımsız bir gözle inceler. Pazarlama dünyasında sıklıkla yapılan "korelasyonu nedensellik sanma", "göreli grafikleri mutlak rakamlara dönüştürme" ve "sektörel genellemeleri evrensel kural sayma" yanılgılarını giderir.

---

## 2. Metodolojik Düzeltmeler ve Metrik Sınırları

### 2.1 Göreli Performans Grafikleri vs. Mutlak Metrikler (TikTok & Reels Yanılgısı)
* **Kaynaklar:** 
  - TikTok Creative Center Analytics: [https://ads.tiktok.com/business/creativecenter/](https://ads.tiktok.com/business/creativecenter/)
  - Meta Reels Video Creative Playbook: [https://www.facebook.com/business/tools/meta-reels](https://www.facebook.com/business/tools/meta-reels)
  - Google Think with Google ABCD Framework: [https://www.thinkwithgoogle.com/marketing-strategies/video/abcd-framework-effective-video-ads/](https://www.thinkwithgoogle.com/marketing-strategies/video/abcd-framework-effective-video-ads/)
* **Yanılgı:** TikTok Creative Center'daki "Second-by-Second Performance" eğrisinin tepe noktasını veya düşüşünü doğrudan o saniyedeki mutlak CTR/CVR dönüşümü sanmak.
* **Doğru Gerçeklik:** TikTok ve Meta'nın saniye bazlı eğrileri **göreceli elde tutma (relative retention / drop-off)** indeksidir. Örneğin 2. saniyedeki %50 izlenme oranı, o saniyede kullanıcıların %50'sinin tıkladığı anlamına gelmez; yalnızca ilk izleyicilerin yarısının henüz kaydırmadığı (scroll yapmadığı) anlamına gelir. 
* **Mesajify Standardı:** Tıklama (CTR) ve dönüşüm (CVR) metrikleri, yalnızca video sonrası veya eş zamanlı gerçekleşen eylemler (link tıklaması, WhatsApp konuşma başlatması) üzerinden hesaplanan **ayrık ve mutlak olaylar (discrete events)** olarak raporlanacaktır.

### 2.2 %40 – %50 Hook Rate Evrensel Bir Yasa Değildir (Test Hipotezi İlkesi)
* **Yanılgı:** "%40 kanca oranının altındaki tüm reklamlar başarısızdır; %40 üzeri ise kesin kazanandır."
* **Doğru Gerçeklik:** Hook Rate (2 saniyelik veya 3 saniyelik oynatma / gösterim) sektöre, hedef kitlenin yaşına, platforma ve teklifin karmaşıklığına göre devasa farklılıklar gösterir:
  - B2C dürtüsel tüketim (ör. gıda, butik giyim): Geniş kitle hedeflemesinde kanca oranı doğal olarak %45–%60 bandına çıkabilir.
  - B2B ağır sanayi / iş makineleri (ör. CNC kalıp, delikli tuğla sevkiyatı): Hedef kitle dar ve profesyoneldir (şantiye şefleri, satın almacılar). Bu kitlede %20–%25 kanca oranı bile son derece nitelikli bir filtreleme yapıp yüksek karlı B2B sipariş getirebilir.
* **Mesajify Standardı:** %40–%50 gibi eşik değerleri bir "evrensel başarı garantisi" değil, yalnızca **optimizasyon için başlangıç test hipotezi (baseline test hypothesis)** olarak kabul edilir.

### 2.3 Doğrulama Etiketleri Standartı
Bundan böyle tüm araştırma ve konseptlerde aşağıdaki 3 etiket zorunlu tutulmuştur:

| Etiket | Tanım ve Şart |
|---|---|
| `PERFORMANCE_VERIFIED` | Yalnızca resmi yayınlanmış, denetlenmiş, erişilebilir sayısal metrikleri (ROAS, CPA, CTR, CVR, dönüşüm adedi) ve doğrudan URL'si bulunan vakalar. |
| `OBSERVED_TREND` | Resmi platform kılavuzlarında (TikTok Creative Playbook, Meta Reels Guide, Google ABCD) nitel olarak önerilen, yönetsel kabul görmüş ancak spesifik rakam açıklamayan modeller. |
| `TEST_HYPOTHESIS` | Henüz canlı platformlarda A/B testi yapılmamış, teorik veya tasarımsal olarak önerilen yeni kreatif kurgular. |

---

## 3. İncelenen Metriklerin Gerçek Anlamları ve "Görünmeyen Metrikler"

Herhangi bir performans metriği incelenirken, arka planda raporlanmayan veya gizlenen "görünmeyen faktörler" hesaba katılmalıdır:

| Erişilebilir Metrik | Ne Anlama Geliyor? | Görünmeyen / Gizli Kalan Faktör (Blind Spot) |
|---|---|---|
| **2s Hook Rate** | Kullanıcının ilk 2 saniyede videoyu kaydırmayıp durduğunu gösterir. | Kullanıcının kancayı yanlış anlayıp (clickbait) 3. saniyede terk edip etmediğini göstermez. |
| **6s Hold Rate** | Kancayı geçenlerin ürün gövdesinde kalmaya devam ettiğini gösterir. | İzleyicinin satın alma niyetini veya güven duyup duymadığını ölçmez; sadece görsel hipnozu gösterir. |
| **Outbound CTR** | Reklam linkine veya WhatsApp butonuna tıklandığını gösterir. | Tıklayan kişinin WhatsApp'a ulaştığında mesaj atıp atmadığını (Drop-off between click & chat) göstermez. |
| **CPL / CPA** | Başlatılan sohbet veya talep başına maliyet. | Müşterinin kalitesini (Qualified vs. Junk Lead) ve gerçekte fatura kesilip kesilmediğini göstermez. |
| **ROAS** | Harcanan 1 TL reklama karşılık elde edilen ciro. | İadeleri, nakliye kırıklarını, müşteri hizmetleri maliyetini ve kar marjını göstermez. |

---

## 4. Gerçek Reklamlarda Etik ve Doğruluk Denetimi

Yapay zeka modellerinin ticari video üretirken uydurmaya (hallucination) meyilli olduğu alanlar ve Mesajify katı engelleri:

1. **Sahte Müşteri Yorumları & Avatarlar:**  
   - *Yasak:* "Ben 2 aydır kullanıyorum, harika ürün" diyen sentetik konuşmacılar üretmek.  
   - *Onaylı:* Gerçek işletme tarafından yazılı veya sesli izni verilmiş müşteri alıntısı veya referanssız doğrudan ürün demosu.
2. **Fizik Dışı Öncesi/Sonrası:**  
   - *Yasak:* Bir tuğlanın mucizevi şekilde depreme %100 dayanıklı olduğunu iddia eden sahte animasyonlar veya kremin tek saniyede kırışıklık sildiği aldatıcı renderlar.  
   - *Onaylı:* Laboratuvar basınç testi, TSE tolerans ölçümü veya gerçek mikronize sis dağılımı.
3. **Uydurma Garanti ve Fiyatlar:**  
   - *Yasak:* Prompt içerisine kafadan "2 Yıl Birebir Değişim", "Şimdi Alana %70 İndirim" eklemek.  
   - *Onaylı:* Yalnızca kullanıcının kampanya sihirbazında girdiği doğrulanmış fiyat veya "WhatsApp'tan Güncel Fiyat Alın" genel çağrısı.

---

*Belge Sonu — Mesajify Claims and Benchmark Audit.*
