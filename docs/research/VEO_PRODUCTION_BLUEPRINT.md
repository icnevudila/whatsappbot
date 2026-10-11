# VEO PRODUCTION BLUEPRINT — GOOGLE VEO 3.1 FAST & POST-PRO SPECIFICATION
**Mesajify Video Engineering & Generative Systems**  
*Document Version: 3.0.0 — Production Standard*  
*Date: 2026-10-11*  
*Target Engine: Google Veo 3.1 Fast (9:16 Vertical, Reference-to-Video)*

---

## 1. Giriş ve Üretim Motoru Standartları

Bu şartname, Mesajify video üretim platformunun **Google Veo 3.1 Fast** modeli üzerindeki çalışma kurallarını belirler.

### Temel Sistem Özellikleri:
* **Model:** Google Veo 3.1 Fast
* **En-Boy Oranı:** 9:16 Dikey Mobil Video (1080x1920)
* **Girdi Modu:** Reference-to-Video (Orijinal tescilli logo PNG + Gerçek kanonik ürün görseli)
* **Temel Süre:** 8.0 saniye ham Veo çıktısı + 2.0 saniye deterministik FFmpeg kurumsal kapanış (Outro) = 10.00 saniye nihai müşteri master'ı.

---

## 2. İki Farklı Çıktı Modu (Brand Film vs. Performance Ad)

Platform iki farklı ticari ihtiyaca göre iki ayrık kurgu modu sunar:

```
+-----------------------------------------------------------------------------------+
|                           MESAJIFY İKİ ÇIKTI MODU                                |
+-----------------------------------------------------------------------------------+
| MOD A: BRAND FILM (Prestij & Marka Filmi)                                         |
| - Sıfır yapay altyazı, sıfır fiyat/indirim, sıfır aciliyet CTA'sı.                |
| - Orijinal marka logosu ürünün fiziksel yüzeyinde doğal olarak korunur.           |
| - Ürünün saf mühendislik kalitesi, zanaatı veya duyusal çekiciliği ön plandadır.  |
| - Kapanış: 2.0s sade, sessiz kurumsal logo kartı (minimalist).                   |
|-----------------------------------------------------------------------------------|
| MOD B: PERFORMANCE AD (Doğrudan Yanıt & Dönüşüm Reklamı)                          |
| - Doğrulanmış teklif, fiyat ve WhatsApp CTA'sı KULLANICI SEÇERSE eklenir.        |
| - Tüm tipografik öğeler Veo'ya ASLA çizdirilmez; FFmpeg post-prodüksiyonunda     |
|   vektörel ve hatasız Türkçe karakterlerle bindirilir.                           |
| - Kapanış: 2.0s doğrulanmış WhatsApp eylem kartı ("Hemen Bilgi Alın").            |
+-----------------------------------------------------------------------------------+
```

---

## 3. Veo 3.1 Fast Çekim Parametreleri (8 Saniyelik Ticari Gramer)

8.0 saniyelik ham çekim, dondurulmuş 3-beat ticari gramerine göre planlanır:

### 3.1 Çekim Anatomisi Tablosu

| Parametre | Beat 1: Hook (0.0 – 2.2s) | Beat 2: Proof (2.2 – 5.8s) | Beat 3: Hero Close (5.8 – 8.0s) |
|---|---|---|---|
| **Kamera Hareketi** | Dinamik hızlı yaklaşma (push-in) veya makro açı | Akıcı izleme (smooth tracking) veya sabit detay | Geniş/orta stabil plan, asil açı |
| **Ürün Hareketi** | En çarpıcı fiziksel temas / çalışma başlangıcı | Kesintisiz akış, örüm, kesim veya panel hareketi | Dengeli, çalışır veya sergilenir durumda |
| **İnsan Jestleri** | Tetiğe basma, mala vurma, ekrana tıklama | Rahat beden dili, usta kontrolü, zanaat | Ürünün yanında gururlu/rahat duruş |
| **Ortam & Işık** | Doğal ortam (sera nemi, şantiye tozu, sıcak mutfak) | Vurgulu yan ışık, dokuyu parlatan gün ışığı | Temiz, aydınlık, estetik son kare |
| **Logo Referansı** | Ürün gövdesindeki kabartma / baskılı logo odaklı | Alet sapı veya kıyafet üzerindeki kurumsal logo | Kadrajın merkezinde net ürün logosu |

---

## 4. Görev Dağılımı ve Deterministik Post-Prodüksiyon Sınırları

Veo'nun halüsinasyona meyilli olduğu alanlar ile FFmpeg'in deterministik gücü net çizgilerle ayrılmıştır:

```
+-----------------------------------------------------------------------------------+
|                        HİBRİT ÜRETİM GÖREV BÖLÜŞÜMÜ                              |
+-----------------------------------------------------------------------------------+
| GÖREV                    | KİM YAPAR?           | NEDEN?                          |
|--------------------------|----------------------|---------------------------------|
| Çevre, Işık ve Fizik     | Google Veo 3.1 Fast  | Su sisi, buhar, harç, ışık      |
| Ürün Geometrisi Temeli   | Google Veo 3.1 Fast  | Referans görselden 3D form alma |
| Kamera Hareketi          | Google Veo 3.1 Fast  | Sinematik derinlik ve akıcılık  |
| Hassas Türkçe Tipografi  | FFmpeg Deterministik | Veo Türkçe karakterleri bozar   |
| Doğrulanmış Fiyat/Teklif | FFmpeg Deterministik | Sayısal verilerde sıfır hata    |
| Tescilli Logo Çıktısı    | FFmpeg Deterministik | Orijinal PNG piksel netliği     |
| 2.0s Branded Outro       | FFmpeg Deterministik | Garantili kurumsal kapanış      |
+-----------------------------------------------------------------------------------+
```

### 4.1 Deterministik Outro Özellikleri (8.0 – 10.0s)
* **Süre:** Tam 2.00 saniye (Kayıpsız `concat`).
* **Format:** 1080x1920 @ 30fps H.264.
* **Görsel:** Orijinal şeffaf PNG logo (maksimum genişlik 500px, dikey ortalanmış), marka ana rengi veya temiz koyu arka plan.
* **Metin (Yalnızca Performans Modunda):** Doğrulanmış eylem çağrısı ("WhatsApp ile İletişime Geçin") ve tescilli yeşil WhatsApp ikonu.
* **Ses:** 8. saniyeden itibaren seslendirme kesilir; fon müziği 1.5 saniyede sıfıra iner (`afade=t=out:st=8.5:d=1.5`).

---

## 5. Çoklu Sahne Kurgu Mimarisi (20–30 Saniyelik Reklamlar)

> **Kritik Mimari İlke:** 20–30 saniyelik uzun formatlı reklamlar **asla tek bir kesintisiz Flow promptu olarak üretilemez**. Veo 8 saniyeden sonra nesne kimliğini ve karakter yüzünü saptırır. Bu format, **birbirine tutarlı kısa sahnelerin harici birleştirilmesidir (multi-scene stitching)**.

```
[Sahne 1: Kanca] (0-5s)    ──> Veo 3.1 Fast (Prompt 1 + Canonical Ref Hash)
         │ (0.3s xfade)
[Sahne 2: Sorun/Ajitasyon] ──> Veo 3.1 Fast (Prompt 2 + Canonical Ref Hash + Ortam Sabiti)
         │ (0.3s xfade)
[Sahne 3: Ürün Çözümü]     ──> Veo 3.1 Fast (Prompt 3 + Canonical Ref Hash + Ürün Hareketi)
         │ (0.3s xfade)
[Sahne 4: Kanıt/Kapanış]   ──> Veo 3.1 Fast (Prompt 4 + Makro İnceleme)
         │ (kesme)
[Deterministik Outro] (2s) ──> FFmpeg Kurumsal Kapanış Kartı
```

### 5.1 Çoklu Sahnede Tutarlılık Protokolü (Consistency Protocol)
1. **Canonical Product Reference Kilidi:** Sahne 1'den Sahne 4'e kadar her üretimde aynı ürün görsel hash'i (`product_ref.jpg`) girdi olarak verilir.
2. **Prompt Ortam Aynılığı:** Ortamı niteleyen metin bloğu (ör. `"in a modern greenhouse with glass panels and green crop rows"`) 4 sahnede de harfiyen kopyalanır.
3. **Maliyet & Kredi Modeli:** 4 bağımsız sahne üretimi nedeniyle bu format **4x temel Veo API kredisi** tüketir. Yalnızca Pro/Enterprise kullanıcılara opsiyonel olarak sunulacaktır.

---

*Belge Sonu — Mesajify Veo Production Blueprint.*
