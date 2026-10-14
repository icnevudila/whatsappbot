# CREATIVE MODEL A/B TEST PLAN & SCIENTIFIC METHODOLOGY
**Mesajify Performance Engineering & Growth Optimization**  
*Document Version: 1.0.0 — Production Standard*  
*Date: 2026-10-11*

---

## 1. Giriş ve Amaç

Bu A/B test planı, Mesajify platformundaki kullanıcıların video reklam kreatiflerini hissiyata veya kişisel zevklere göre değil; istatistiksel olarak doğrulanmış, ampirik performans verilerine göre optimize etmelerini sağlamak amacıyla tasarlanmıştır.

Platform üzerinde üretilen farklı **Creative DNA Modelleri** (örneğin *Problem-Solution* vs. *Product Demo*), kontrollü reklam deneyleriyle yarıştırılarak en düşük edinme maliyetiyle (CPA) en yüksek WhatsApp dönüşümünü sağlayan şablonlar tespit edilir.

---

## 2. Test Hipotezleri (Sektör Bazlı Eşleşmeler)

| Sektör | Varyant A (Kontrol) | Varyant B (Test) | Hipotez |
|---|---|---|---|
| **Tarım** | *Problem-Solution:* Manuel yorgunluk kancası -> Akülü çözüm | *Product Demo:* 5 Bar sabit basınç ve mikronize sis yakın çekimi | Tarım üreticileri, mekanik dayanıklılık ve püskürtme kalitesini (Demo) gördüklerinde WhatsApp üzerinden siparişe %25 daha yüksek oranda yönelir ($H_1$). |
| **İnşaat** | *Product Demo:* Tuğla basma/kırılma testi ve milimetrik gözenek | *Offer-First:* Şantiyeye anında sevk ve fabrika toptan fiyat teklifi | Müteahhit ve şantiye şefleri için teslimat hızı ve toptan iskonto (Offer-First), teknik detaydan %20 daha yüksek teklif talebi üretir ($H_2$). |
| **Restoran** | *Sensory Hook:* ASMR cızırtı, eriyen peynir, bıçak kesimi | *UGC Interaction:* Masada oturan müşterinin ilk lokma memnuniyeti | Duyusal iştah kancaları (Sensory), UGC formatına kıyasla 2 saniyelik kanca oranını (Hook Rate) en az %30 artırır ($H_3$). |
| **Çiçekçilik** | *Aesthetic Unboxing:* Canlı buketin kutudan çıkarılışı ve su damlaları | *How-To:* 3 adımda kişiye özel buket tasarımı ve sipariş adımı | Beklenmedik estetik hediye kutusu açılışı (Unboxing), sepete ekleme ve WhatsApp danışman hattı tıklamasını %35 artırır ($H_4$). |
| **SaaS** | *Problem-Solution:* Excel kargaşası ve bloke olan WhatsApp hatları | *Feature Demo:* Akıllı hat rotalama panelinin canlı grafik akışı | Operasyonel acıyı vurgulayan kanca (Problem-Solution), özellik anlatan videoya göre %40 daha düşük CPL (Maliyet Başına Müşteri) sağlar ($H_5$). |

---

## 3. Metrik Hiyerarşisi

```
+---------------------------------------------------------------------------------+
|                               METRİK HİYERARŞİSİ                                |
+---------------------------------------------------------------------------------+
| 1. KANCA METRİĞİ (Dikkat):      Hook Rate (2s / 3s Views / Impressions)         |
| 2. TUTUNMA METRİĞİ (İlgi):      Hold Rate (6s Views / 2s Views)                 |
| 3. TIKLAMA METRİĞİ (Niyet):     Outbound CTR (WhatsApp Link Tıklaması / Imp.)   |
| 4. DÖNÜŞÜM METRİĞİ (İşlem):     WhatsApp Konuşma Başlatma Oranı (Chat Starts)   |
| 5. FİNANSAL METRİK (Verim):     CPL / CPA (Maliyet Başına Nitelikli Müşteri)   |
+---------------------------------------------------------------------------------+
```

### 3.1 Birincil (Primary) Metrikler
* **2s Hook Rate (TikTok/Reels):** Reklamın ilk 2 saniyesinde izleyicinin parmak hareketini durdurma başarısı. Hedef: $\ge \%40$.
* **WhatsApp Outbound CTR:** Videoyu izleyen kullanıcıların doğrudan WhatsApp hattına tıklama oranı. Hedef: $\ge \%1.5$.

### 3.2 İkincil (Secondary) Metrikler
* **6s Hold Rate:** Ürün kanıtının izleyiciyi videoda tutma gücü. Hedef: $\ge \%45$.
* **CPL (Cost Per Lead / WhatsApp Başına Maliyet):** Harcanan toplam reklam bütçesinin başlayan tekil WhatsApp sohbetine bölümü.

---

## 4. İstatistiksel Metodoloji & Örneklem Büyüklüğü

### 4.1 İstatistiksel Anlamlılık Parametreleri
* **Güven Düzeyi ($\alpha$):** $\%95$ ($p < 0.05$, $Z_{\alpha/2} = 1.96$)
* **İstatistiksel Güç ($1 - \beta$):** $\%80$ ($Z_\beta = 0.84$)
* **Minimum Saptanabilir Etki (MDE):** En az $\%15$ oransal fark (örneğin CTR $\%1.20$'den $\%1.38$'e çıkış).

### 4.2 Örneklem Büyüklüğü Hesaplama Formülü
İki oran arasındaki farkı saptamak için gereken minimum tekil gösterim ($n$):

$$n = \frac{2 \times (Z_{\alpha/2} + Z_{\beta})^2 \times p \cdot (1 - p)}{\Delta^2}$$

*Örnek Hesaplama:*  
Temel CTR ($p$) = $\%1.2$ ($0.012$), MDE ($\Delta$) = $\%0.2$ ($0.002$ mutlak fark) olduğunda:
Varyant başına minimum **~18.500 gösterim (impression)** veya en az **250 tıklama** toplanmalıdır.

---

## 5. Test Uygulama & Karar Protokolü (Playbook)

### 5.1 Test Süresi ve Bütçe Dağılımı
* **Süre:** Minimum 7 gün (hafta içi ve hafta sonu tüketici davranışını kapsayacak şekilde).
* **Trafik Dağılımı:** $\%50 / \%50$ rastgele split test (Meta Advantage+ veya TikTok Split Test aracı ile kitle çakışması önlenir).
* **Bütçe:** Her varyant için günlük eşit bütçe tanımlanır; erken manuel müdahale yapılmaz.

### 5.2 Erken Durdurma Kuralları (Stopping Rules)
1. **Negatif Durdurma:** Bir varyant ilk 3.000 gösterimde $\%15$'in altında Hook Rate ve $\%0.4$'ün altında CTR üretirse test bütçesini korumak için 48. saatte kapatılabilir.
2. **Pozitif Karar:** $p < 0.05$ güven düzeyine ulaşıldığında ve minimum 250 WhatsApp tıklaması kaydedildiğinde test sonlandırılır.

### 5.3 Karar Ağacı (Decision Tree)

```
                            [A/B TEST SONUCU]
                                    |
          +-------------------------+-------------------------+
          |                                                   |
    [Varyant B Kazandı]                                 [Fark Anlamsız]
   (p < 0.05, CTR +%20)                               (p > 0.05, Fark <%5)
          |                                                   |
+------------------------+                          +------------------------+
| 1. B Varyantı %100     |                          | 1. Kancalar çok benzer |
|    bütçeyle ana model  |                          | 2. Yeni kanca açısı    |
|    olarak kilitlenir.  |                          |    (açılış 2s) tasarla.|
| 2. Yeni A/B döngüsünde |                          | 3. Teklifi/CTA'yı      |
|    bu sefer outro ve   |                          |    keskinleştir.       |
|    CTA metni test      |                          +------------------------+
|    edilir.             |
+------------------------+
```

---

*Belge Sonu — Mesajify Creative Model A/B Test Plan.*
