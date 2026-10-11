# CODEX HANDOFF COMPATIBILITY — MESAJIFY CAMPAIGN STUDIO V1

## 1. Paralel Çalışma ve İzolasyon Durumu

Görev talimatı gereği, Codex botunun paralel olarak geliştirmekte olduğu branch (`codex/wizard-reference-download`, `6ffc871`) ile doğrudan merge yapılmamış ve Codex'in çalışma alanlarına müdahale edilmemiştir.

Codex'in üzerinde çalıştığı alanlar:
- Wizard ürün/logo referans esnekliği
- Marka tanıtımı modu
- Doğrudan PNG/JPG/MP4 indirme endpoint'leri
- `NEEDS_REVIEW` sadeleştirmesi ve onay akışları

Campaign Studio V1 ise tamamen **kreatifin kampanyaya dönüştürülmesi ve kalıcı taslak deneyimi** (`feat/master-campaign-studio-v1`) üzerinde odaklanmıştır.

---

## 2. Ortak Dosyalar ve Değişiklik Özeti

İki ekibin kesişebileceği ortak dosyalar ve yapılan minimum-dokunma değişiklikleri:

1. `apps/customer/src/app/(panel)/kampanyalar/wizard-data.ts`:
   - `loadCampaignCreativeHandoff` fonksiyonunda mevcut `isImageReviewApproved` ve `loadVideoLibraryState` kontratı korunmuştur.
   - Codex'in review sadeleştirmesi tamamlandığında, `loadCampaignCreativeHandoff` yalnızca onaylı kreatifi okuma kontratını koruyarak sorunsuz çalışacaktır.
2. `apps/customer/src/app/(panel)/kampanyalar/campaign-wizard.tsx`:
   - Handoff parametreleri (`initialCreative`) ile gelen kreatifin `messageType` ve `mediaUrl` değerlerini başlatması güvenceye alınmıştır.
   - Kullanıcının yazdığı metin, otomatik AI metin üretimi tarafından ezilmeyecek şekilde korunmuştur.
3. `apps/customer/src/app/(panel)/kampanyalar/campaign-preview.tsx` & `campaign-wizard-ui.tsx`:
   - Canlı WhatsApp simülatöründe `<video>` etiketi desteği eklenmiştir.

---

## 3. İlerideki Ortak Entegrasyon İçin Önerilen Adımlar

1. Codex branch'i (`codex/wizard-reference-download`) Master'a birleştirildiğinde, Campaign Studio branch'i rebase edilecektir.
2. `wizard-data.ts` içinde Codex'in güncellediği medya onaylama fonksiyonları ile Campaign Studio'nun handoff kontratı otomatik olarak tam uyumlu çalışacaktır.
3. İki botun ortak E2E testi birleştirildiğinde, "Kreatif Üret -> İndir / Kampanyada Kullan -> Taslak Kaydet / Gönder" uçtan uca akışı eksiksiz doğrulanabilecektir.
