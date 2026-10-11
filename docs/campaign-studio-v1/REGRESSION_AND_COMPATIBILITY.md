# REGRESSION AND COMPATIBILITY — MESAJIFY CAMPAIGN STUDIO V1

## 1. Canlı Gönderim Altyapısının Korunumu

Bu görevin en kritik kısıtlarından biri, canlı WhatsApp gönderim mantığının (`startCampaign`, `scheduleCampaign`, `campaign.start`, `campaign.refresh_targets`, WA worker kuyrukları) global olarak kapatılmaması veya bozulmamasıydı.

Yapılan değişiklikler tamamen **şartlı ve izole** tutulmuştur:
- **`actions.ts` - `createCampaign` & `updateCampaign`:**
  - `startMode === 'draft'` olduğunda `listIds` ve `accountIds` validasyonu devre dışı bırakılır, hedef yenileme (`campaign.refresh_targets`) ve başlatma (`campaign.start`) işleri atlanır.
  - Ancak `startMode === 'now'` veya `startMode === 'schedule'` seçildiğinde, mevcut katı doğrulamalar aynen çalışır (`minLists === 1`, `minAccounts === 1`, hatların bağlı olması, `campaign.refresh_targets` enque edilmesi).
  - Canlı gönderim akışında hiçbir gerileme (regression) yaratılmamıştır.

---

## 2. Geriye Dönük Uyumluluk (Backward Compatibility)

1. **Mevcut Kampanyalar:**
   - Var olan `draft`, `scheduled`, `running`, `paused`, `completed`, `failed` durumundaki kampanyalar şema veya davranış değişikliğinden etkilenmemiştir.
2. **Kampanya Detay Ekranı (`/kampanyalar/[id]`):**
   - Kampanya detay sayfasında (`campaign-live.tsx`), "Kopyala" aksiyonu `duplicateCampaign` sonrasında `window.location.assign` ile yeni taslak düzenleme sayfasına kesintisiz aktarılır.
   - "Önizle" modal butonu artık hem `image` hem de `video` mesaj tiplerini destekler.
3. **Mevcut Liste ve Hat Seçiciler:**
   - `AudiencePicker` ve `SenderPicker` bileşenleri eski yapılarıyla uyumlu çalışır; tek bir hat bağlıysa otomatik seçilme davranışı korunmuştur.
