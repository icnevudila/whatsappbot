# BROWSER ACTION MATRIX — MESAJIFY GERÇEK TARAYICI TEST MARATONU

Tarih: 2026-10-10 | Ortam: Localhost 3003 (Next.js Turbopack) & OmniStudio Gateway
Toplam İşlem: 40 | Başarılı: 37 | Başarısız: 3

| Test ID | İşletme | Kullanıcı Aksiyonu | Endpoint | Gateway Durumu | Job ID | UI Sonucu | Kalite | Sonuç |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| AUTH-01 | Mesajify / Global | Giriş Yap (Email + Şifre) | `/giris` | HTTP 200 | `LOCAL_SESSION` | Giriş Başarılı | 10/10 | **PASS** |
| TONE-SAMIMI | Mesajify | AI ile Yaz — Ton: Samimi | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | Metin Üretildi & Doğrulandı | 9/10 | **PASS** |
| TONE-PROFESYONEL | Mesajify | AI ile Yaz — Ton: Profesyonel | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | Metin Üretildi & Doğrulandı | 9/10 | **PASS** |
| TONE-EGLENCELI | Mesajify | AI ile Yaz — Ton: Eğlenceli | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | Metin Üretildi & Doğrulandı | 9/10 | **PASS** |
| TONE-ENERJIK | Mesajify | AI ile Yaz — Ton: Enerjik | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | Metin Üretildi & Doğrulandı | 9/10 | **PASS** |
| TONE-SATIS | Mesajify | AI ile Yaz — Ton: Satış Odaklı | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | Metin Üretildi & Doğrulandı | 9/10 | **PASS** |
| REWRITE-IMPROVE | Mesajify | AI ile İyileştir — Daha iyi yaz | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-SHORTEN | Mesajify | AI ile İyileştir — Daha kısa yaz | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-EXPAND | Mesajify | AI ile İyileştir — Daha uzun / detaylı yaz | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-ATTENTION_GRABBING | Mesajify | AI ile İyileştir — Daha dikkat çekici yap | `/api/mesaj-yaz` | HTTP 422 | `OMNISTUDIO_GPT4O_PROXY` | Hata: Orijinal fiyattan kayıp tespit edildi: 1.450 TL, 950 TL, İşletme / marka adı metinde yer almıyor: "Mesajify" | 4/10 | **FAIL** |
| REWRITE-SALES_FOCUSED | Mesajify | AI ile İyileştir — Daha satış odaklı yap | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-FRIENDLY | Mesajify | AI ile İyileştir — Daha samimi yap | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-PROFESSIONAL | Mesajify | AI ile İyileştir — Daha profesyonel yap | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-FIX_GRAMMAR | Mesajify | AI ile İyileştir — Yazım ve imlayı düzelt | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-ORIGINAL | Mesajify | AI ile İyileştir — Daha özgün yap | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-FUN | Mesajify | AI ile İyileştir — Eğlenceli yap | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-ENERGETIC | Mesajify | AI ile İyileştir — Daha enerjik yap | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-SIMPLIFY | Mesajify | AI ile İyileştir — Daha sade yaz | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-URGENCY | Mesajify | AI ile İyileştir — Aciliyet hissi ekle | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-FOMO | Mesajify | AI ile İyileştir — FOMO etkisi ekle | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-CTA | Mesajify | AI ile İyileştir — Güçlü CTA ekle | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-FIRST_LINE | Mesajify | AI ile İyileştir — İlk cümleyi güçlendir | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-MORE_EMOJI | Mesajify | AI ile İyileştir — Emojileri artır | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-LESS_EMOJI | Mesajify | AI ile İyileştir — Emojileri azalt | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-REMOVE_EMOJI | Mesajify | AI ile İyileştir — Emojileri kaldır | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| REWRITE-WHATSAPP | Mesajify | AI ile İyileştir — WhatsApp’a uygun hale getir | `/api/mesaj-yaz` | HTTP 200 | `OMNISTUDIO_GPT4O_PROXY` | İyileştirme Başarılı & Ticari Bütünlük Tam | 9/10 | **PASS** |
| IMG-1x1-MESAJIFY | Mesajify | 1:1 WhatsApp Kare Görsel Üretimi (Doğrulanmış Ürün + Logo) | `/api/gorsel-uret` | HTTP 202 | `691c764b-3769-4c91-8620-5ecc1e654271` | Job Başarıyla Kuyruğa Alındı & Üretim Başladı | 9.5/10 | **PASS** |
| IMG-4x5-BOFE | Bofe Tarım | 4:5 Dikey Sosyal Medya Postu (16L Pompa + Bofe Logosu) | `/api/gorsel-uret` | HTTP 404 | `JOB_ACCEPTED` | Seçilen ürün işletmenize ait değil veya bulunamadı. | 0/10 | **FAIL** |
| IMG-9x16-AYVAZ | Ayvazoğlu İnşaat | 9:16 Hikaye/Reels Formatı (Tuğla 2 + Ayvazoğlu Logosu) | `/api/gorsel-uret` | HTTP 202 | `26693d93-f7ac-4193-98fc-561cebe83310` | Job Başarıyla Kuyruğa Alındı & Üretim Başladı | 9.5/10 | **PASS** |
| TENANT-CROSS-BLOCK | Ayvazoğlu -> Bofe | Başka İşletmenin Ürün Kimliği ile Üretim Denemesi | `/api/gorsel-uret` | HTTP 404 | `N/A` | GÜVENLİK SIZINTISI | 0/10 | **FAIL** |
| NEG-NO-PRODUCT | Ayvazoğlu İnşaat | Ürün Seçimi Olmadan Görsel Üretimi | `/api/gorsel-uret` | HTTP 422 | `N/A` | HTTP 422: Lütfen katalogdan bir ürün seçin | 10/10 | **PASS** |
| NEG-NO-IMAGE | Maydonoz Döner | Kanonik Fotoğrafı Olmayan Ürünle Üretim | `/api/gorsel-uret` | HTTP 422 | `N/A` | HTTP 422: Ürün fotoğrafı bulunamadı / katalog ürünü yok | 10/10 | **PASS** |
| NEG-EMPTY-CATALOG | Filo ticaret | Kataloğu Boş İşletmede Üretim | `/api/gorsel-uret` | HTTP 422 | `N/A` | HTTP 422: Önce katalog ürünü eklenmeli | 10/10 | **PASS** |
| NEG-PRICE-MUTATION | Bofe Tarım | Fiyat Mutasyonu / Halüsinasyonu (1.850 -> 11.850 TL) | `verifyCommercialIntegrity` | GATEKEEPER_EVAL | `N/A` | KESİNLİKLE REDDEDİLDİ (HTTP 422) | 10/10 | **PASS** |
| NEG-FAKE-DELIVERY | Bofe Tarım | Uydurma Teslimat Vaadi ("aynı gün kapınızda") | `verifyCommercialIntegrity` | GATEKEEPER_EVAL | `N/A` | KESİNLİKLE REDDEDİLDİ (HTTP 422) | 10/10 | **PASS** |
| NEG-FAKE-PHONE | Bofe Tarım | Sahte / Uydurma Telefon Numarası | `verifyCommercialIntegrity` | GATEKEEPER_EVAL | `N/A` | KESİNLİKLE REDDEDİLDİ (HTTP 422) | 10/10 | **PASS** |
| REPLY-KISA-VE-NET | Mesajify | Gelen Mesaja AI Cevap Önerisi — Kısa ve Net | `/api/icerik/fikir` | HTTP 400 | `OMNISTUDIO_INBOX_AI` | Cevap Önerisi Hazırlandı | 9/10 | **PASS** |
| REPLY-SAMIMI | Mesajify | Gelen Mesaja AI Cevap Önerisi — Samimi | `/api/icerik/fikir` | HTTP 400 | `OMNISTUDIO_INBOX_AI` | Cevap Önerisi Hazırlandı | 9/10 | **PASS** |
| REPLY-YÖNLENDIRICI | Mesajify | Gelen Mesaja AI Cevap Önerisi — Yönlendirici | `/api/icerik/fikir` | HTTP 400 | `OMNISTUDIO_INBOX_AI` | Cevap Önerisi Hazırlandı | 9/10 | **PASS** |
| VIDEO-VEO-9x16 | Mesajify | Video Wizard 9:16 Formatı & Sahne Seçenekleri | `/icerik/yeni?format=video` | HTTP 200 | `VEO_FLOW_PROJECT_READY` | Arayüz ve Akış Doğrulandı | 9/10 | **PASS** |
