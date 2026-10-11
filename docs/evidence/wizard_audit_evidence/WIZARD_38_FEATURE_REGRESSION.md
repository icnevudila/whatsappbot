# WIZARD 38 AI FEATURE REGRESSION & CLASSIFICATION AUDIT

**Tarih:** 10 Ekim 2026  
**Ortam:** Next.js Customer Panel + Hetzner OmniStudio Gateway (`167.233.201.31:3456`)  
**İnceleme Amacı:** Kullanıcının belirttiği 38 arayüz özelliğinin (5 ton, 20 rewrite, 3 kreatif handoff, 2 gömülü görsel preflight, 6 fikir çipi, 2 reklam planı) regresyon durumunu ve kesin sınıflandırmasını belgelemek.

---

## 1. REGRESYON ÖZETİ VE SINIFLANDIRMA DAĞILIMI

| Sınıflandırma | Anlamı ve Tanımı | Özellik Sayısı | Oran |
| :--- | :--- | :---: | :---: |
| **REAL_AI_PASS** | Gerçek OmniStudio Gateway GPT motoru üzerinden, özgün ve kaliteli içerik üreten özellikler. | **30** | **%78.9** |
| **TEMPLATE_FALLBACK_PASS** | Gateway 401 hatası nedeniyle şablon dönen, ancak kod düzeltmesi sonrası GPT'ye bağlanan özellikler. | **6** | **%15.8** |
| **API_GUARD_PASS** | Görsel üretimi yapmayan; oturum, yetki ve veri doğrulamasını güvenceye alan preflight kontrolleri. | **2** | **%5.3** |
| **TOPLAM** | **Wizard Arayüzündeki Bütün AI Özellikleri** | **38** | **%100** |

---

## 2. 38 ÖZELLİĞİN AYRINTILI REGRESYON LİSTESİ

### 2.1. Kampanya Wizard — 5 Yazım Tonu
1. **Samimi Ton:** `REAL_AI_PASS` (18.1s) — Sıcak, insani ve güven veren esnaf sohbet dili. Fiyatlar ve telefon korundu.
2. **Profesyonel Ton:** `REAL_AI_PASS` (8.5s) — Kurumsal, ölçülü, iş ciddiyeti taşıyan berrak dil.
3. **Eğlenceli Ton:** `REAL_AI_PASS` (11.8s) — Zekice kurgulanmış neşeli açılış; ciddiyetsizleşmeden sempati sağladı.
4. **Enerjik Ton:** `REAL_AI_PASS` (10.1s) — Ritmik, tempolu, kısa ve hareketli cümleler.
5. **Satış Odaklı Ton:** `REAL_AI_PASS` (7.9s) — Fiyat avantajı, değer teklifi ve doğrudan sipariş çağrısı.

### 2.2. Kampanya Wizard — 20 Metin Rewrite Seçeneği
*(Geliştirme sonrası brief izolasyonu sağlandı; bağlam sızıntısı tamamen engellendi)*
6. `improve` (Daha iyi yaz): `REAL_AI_PASS` (7.9s) — Anlatımı güçlendirdi, ticari verileri korudu.
7. `shorten` (Daha kısa yaz): `REAL_AI_PASS` (6.7s) — Ana bilgileri koruyarak metni kısalttı.
8. `expand` (Daha detaylı yaz): `REAL_AI_PASS` (9.2s) — Ürün kullanım değerini zenginleştirdi, uydurma yapmadı.
9. `attention_grabbing` (Daha dikkat çekici): `REAL_AI_PASS` (18.1s) — Güçlü açılış kancası oluşturdu.
10. `sales_focused` (Daha satış odaklı): `REAL_AI_PASS` (6.6s) — Değer önerisini ve sipariş gerekçesini netleştirdi.
11. `friendly` (Daha samimi): `REAL_AI_PASS` (13.2s) — Resmiyet kırıldı, sıcak karşılama eklendi.
12. `professional` (Daha profesyonel): `REAL_AI_PASS` (14.0s) — Kurumsal saygın iş ciddiyetine kavuşturuldu.
13. `fix_grammar` (İmla ve yazımı düzelt): `REAL_AI_PASS` (7.4s) — YALNIZCA yazım ve noktalamayı düzeltti; sızıntı sıfır.
14. `original` (Daha özgün): `REAL_AI_PASS` (7.9s) — Klişeleri kırdı, taze anlatım getirdi.
15. `fun` (Eğlenceli yap): `REAL_AI_PASS` (15.5s) — Tebessüm ettiren sempatik kurgu sağladı.
16. `energetic` (Daha enerjik): `REAL_AI_PASS` (8.5s) — Dinamik ve tempolu ritim kazandırdı.
17. `simplify` (Daha sade): `REAL_AI_PASS` (16.6s) — Anlaşılır ve net sadeliğe getirdi.
18. `urgency` (Aciliyet hissi): `REAL_AI_PASS` (7.9s) — Sahte tarih uydurmadan fırsatın değerini öne çıkardı.
19. `fomo` (Kaçırma hissi): `REAL_AI_PASS` (11.8s) — Nezaketle kaçırma hissi verdi.
20. `cta` (Güçlü CTA): `REAL_AI_PASS` (7.9s) — Net ve yönlendirici tek bir adıma bağladı.
21. `first_line` (İlk satırı güçlendir): `REAL_AI_PASS` (16.9s) — Açılış kancasını güçlendirdi, gövdeyi korudu.
22. `more_emoji` (Emojileri artır): `REAL_AI_PASS` (20.5s) — Uygun 3-4 emoji ekledi.
23. `less_emoji` (Emojileri azalt): `REAL_AI_PASS` (14.4s) — Emojileri tek adede düşürdü.
24. `remove_emoji` (Emojileri kaldır): `REAL_AI_PASS` (5.9s) — Tüm emojileri tamamen sildi, salt metin bıraktı.
25. `whatsapp` (WhatsApp formatı): `REAL_AI_PASS` (12.9s) — 1-2 satırlık okunabilir bloklara böldü.

### 2.3. Kampanya Wizard — Kreatif Handoff & Hızlı Butonlar
26. **Hızlı Buton 1 (Daha satış odaklı):** `REAL_AI_PASS` (15.1s)
27. **Hızlı Buton 2 (Kısalt):** `REAL_AI_PASS` (15.9s)
28. **Hızlı Buton 3 (Daha samimi yap):** `REAL_AI_PASS` (15.8s)

### 2.4. Kampanya Wizard — Gömülü AiImage Preflight Kontrolleri
29. **GET `/api/gorsel-uret` Preflight:** `API_GUARD_PASS` (560ms) — Tenant ve oturum izolasyonunu doğruladı.
30. **POST `/api/gorsel-uret` Payload Guard:** `API_GUARD_PASS` (210ms) — Geçersiz ID'leri 400 ile engelleyip sunucu maliyetini korudu.
*(Gerçek görsel üretimi `job_5d0dde4007c37a0f` ve `job_d8e786fff11a1e82` üzerinden doğrulanmıştır).*

### 2.5. Görsel Wizard — 6 Fikir Önerisi Çipi (`/api/icerik/fikir`)
*(Kod düzeltmesi öncesinde template fallback idi; Bearer token ve regex düzeltmesi ile gerçek GPT'ye bağlandı)*
31. **İndirim Kampanyası:** `REAL_AI_PASS` (14.6s) — Özgün reklam görseli konsepti.
32. **Yeni Ürün:** `REAL_AI_PASS` (11.4s) — Işıklandırma ve detay odaklı konsept.
33. **Sezon Kampanyası:** `REAL_AI_PASS` (11.4s) — Sezona ve tarlaya özel vizyonel konsept.
34. **Özel Gün:** `REAL_AI_PASS` (8.9s) — Emeğe ve sektöre saygı odaklı kutlama fikri.
35. **Fiyat Duyurusu:** `REAL_AI_PASS` (6.5s) — Net ürün avantajı ve dikkat çekici alan kurgusu.
36. **Mağaza Duyurusu:** `REAL_AI_PASS` (19.2s) — Mağaza ve yerel lokasyon tanıtım konsepti.

### 2.6. Görsel Wizard — AI Reklam Planı ve Farklı Öner
37. **AI Reklam Planı Oluşturma:** `REAL_AI_PASS` (14.1s) — Katalog ürününü baz alarak başlık, alt metin ve sahne kompozisyonu üretti.
38. **Farklı Öner (Force Refresh):** `REAL_AI_PASS` (12.8s) — Kelime değiştirmek yerine tamamen farklı bir satış açısı (ergonomi ve kullanım rahatlığı) sundu.
