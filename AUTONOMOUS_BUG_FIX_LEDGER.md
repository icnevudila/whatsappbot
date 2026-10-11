# OTONOM HATA DÜZELTME DEFTERİ (AUTONOMOUS BUG FIX LEDGER)

**Proje:** Mesajify Master Engineering  
**Branch:** `feat/codex-wizard-real-e2e-v2`  
**Tarih Aralığı:** 10–11 Ekim 2026

---

## Düzeltilen Hatalar ve Kök Neden Analizleri

### 1. HATA: Boş AI Çıktısının Mevcut Kampanya Metnini Silmesi
- **Kök Neden:** AI sağlayıcısı zaman aşımına uğradığında veya boş string döndürdüğünde, editör state'i kontrolsüz güncellenerek kullanıcının yazdığı taslak metni siliyordu.
- **Çözüm:** `verifyCommercialIntegrity` fonksiyonuna boş metin denetimi eklendi (`drifts.push('Üretilen kampanya metni boş.')`). İstemci editöründe boş yanıt gelirse state güncellemesi engellendi.
- **Dosyalar:** `apps/customer/src/lib/ai/campaign-message.ts`, `apps/customer/src/app/(panel)/kampanyalar/campaign-wizard.tsx`
- **Doğrulama:** `scripts/test_campaign_integrity_unit.ts` Unit Test (PASS).

### 2. HATA: AI Tarafından Üretilen "Kampanya Mesajı:" Başlık Etiketleri
- **Kök Neden:** Dil modellerinin Türkçe promptlarda metnin başına "Ayvazoğlu WhatsApp Kampanya Mesajı:" veya "İşte metniniz:" gibi yönlendirme etiketleri basması.
- **Çözüm:** `cleanAiMessage` fonksiyonu geliştirildi. Türkçe unicode (`İ/i`) harf duyarlılığı eklenerek regex temizliği sağlandı:
  ```ts
  .replace(/^(?:işte|İşte|iste|İste)\s+(?:mesajınız|metniniz)[:\s]*/iu, '')
  ```
- **Dosyalar:** `apps/customer/src/lib/ai/campaign-message.ts`
- **Doğrulama:** Unit test ile tırnaklı ve başlıklı metinlerin temizlendiği doğrulandı (PASS).

### 3. HATA: Wizard Adım 1'de Logo veya Ürün Eksikken Butonun Sessizce Kilitlenmesi
- **Kök Neden:** Kullanıcı logosu veya ürünü tanımlamadığında "Devam Et" butonu pasif kalıyor ancak neden pasif olduğuna dair hiçbir ipucu verilmiyordu.
- **Çözüm:** Butonun soluna dinamik, yönlendirici ve açıklayıcı uyarı alanı eklendi (Örn: *"Devam etmek için Ayarlar > Marka Kiti sayfasından işletme logonuzu ekleyin."*).
- **Dosyalar:** `apps/customer/src/app/(panel)/icerik/creative-studio-v2.tsx`
- **Doğrulama:** Browser E2E ekran görüntüsü ile doğrulandı.

### 4. HATA: Video Oynatımında Codec Uyumsuzluğu (Headless Chromium)
- **Kök Neden:** Açık kaynaklı temel Chromium derlemelerinde H.264/AAC donanım lisansı bulunmadığı için `<video>` etiketi `DEMUXER_ERROR_NO_SUPPORTED_STREAMS` hatası veriyordu.
- **Çözüm:** Playwright test çalıştırıcısı lisanslı Microsoft Edge (`channel: 'msedge'`) motoruna geçirildi.
- **Dosyalar:** `scripts/test_media_acceptance_suite.mjs`, `scripts/master_60_acceptance_runner.mjs`
- **Doğrulama:** `readyState: 4`, 10 sn kesintisiz akış ve seek testi kaydedildi (PASS).

### 5. HATA: npx tsx Sürecinin Asılı Kalması (Stalled Background Process)
- **Kök Neden:** Windows PowerShell ortamında `npx tsx -e` komutunun interaktif stdin beklemesine girerek log üretmeden askıda kalması.
- **Çözüm:** Süreç `manage_task kill` ile izole şekilde sonlandırıldı; test Node.js v22 yerel `--experimental-strip-types` motoruna taşındı.
- **Doğrulama:** Test 1.2 saniyede 6/6 PASS olarak başarıyla sonuçlandı.
