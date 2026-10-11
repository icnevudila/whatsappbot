# Campaign Studio V1: Mevcut Durum Analizi (Existing State)

**Tarih:** 11 Ekim 2026  
**Yazar:** Master Bot — Campaign Studio V1 Ürün Sorumlusu  
**Branch:** `feat/master-campaign-studio-v1`  
**Referans Commit:** `aa2673aa440b96102c54ec7733e0b4934af7d0df`  

---

## 1. Giriş ve İnceleme Amacı

Mesajify kullanıcılarının AI ile oluşturdukları reklam görsellerini veya videolarını doğrudan profesyonel bir WhatsApp kampanyasına dönüştürebilmeleri için mevcut kod tabanındaki bileşenler, server action'lar, veri şeması ve kullanıcı deneyimi ayrıntılı olarak incelenmiştir.

İncelenen temel dosyalar:
- `apps/customer/src/app/(panel)/kampanyalar/campaign-wizard.tsx`
- `apps/customer/src/app/(panel)/kampanyalar/campaign-wizard-ui.tsx`
- `apps/customer/src/app/(panel)/kampanyalar/campaign-preview.tsx`
- `apps/customer/src/app/(panel)/kampanyalar/actions.ts`
- `apps/customer/src/app/(panel)/kampanyalar/wizard-data.ts`
- `apps/customer/src/app/(panel)/kampanyalar/campaign-wizard-types.ts`
- `apps/customer/src/app/(panel)/kampanyalar/yeni/page.tsx`
- `apps/customer/src/app/(panel)/kampanyalar/[id]/page.tsx`
- `apps/customer/src/app/(panel)/kampanyalar/[id]/duzenle/page.tsx`
- `apps/customer/src/lib/campaign-validation.ts`

---

## 2. Tespit Edilen Kritik Sorunlar ve Kusurlar

### 2.1. P0 — Taslak Kaydetme Sırasında Hedef ve Hat Zorunluluğu (createCampaign & updateCampaign)
- **Mevcut Davranış:**  
  `actions.ts` içerisindeki `createCampaign` fonksiyonunda (satır 64-65) ve `updateCampaign` fonksiyonunda (satır 311-312):
  ```typescript
  if (listIds.length === 0) return { error: 'En az bir kişi grubu seçin.' }
  if (accountIds.length === 0) return { error: 'En az bir gönderen hat seçin.' }
  ```
  Ayrıca `campaign-wizard.tsx` `validateStep` fonksiyonunda (satır 294, 301) kullanıcı 'alicilar' ve 'gonderen' adımlarından geçmeden 'yayinla' aşamasına gidememekte ve taslak olarak bile olsa kampanyasını kaydedememektedir.
- **Kök Neden:**  
  Uygulama, "kampanya hazırlama (taslak oluşturma)" ile "kampanyayı canlı yayına alma / gönderme" fazlarını tek bir doğrulamaya tabi tutmuştur.
- **Kullanıcı Etkisi:**  
  Henüz WhatsApp hattı bağlanmamış veya kişi grubu import edilmemiş olan yeni bir işletme, AI ile harika bir reklam görseli üretip kampanya metnini hazırladıktan sonra "Taslağı Kaydet" butonuna basamamakta; tüm çalışması kaybolmaktadır.

### 2.2. P0 — Veritabanı Şeması Analizi (Additive Migration Gerekli mi?)
- PostgreSQL `campaigns` tablosu `information_schema` ve `pg_constraint` üzerinden incelendi:
  - `source_list_ids`: `uuid[]`, varsayılan `'{}'::uuid[]`, `is_nullable = NO`. Yani boş dizi `[]` (`'{}'::uuid[]`) DB seviyesinde tamamen geçerlidir!
  - `campaign_accounts` tablosu: Kampanya ile hatları eşleyen ara tablodur. Kampanyaya ait hiçbir hat bağlanmadığında bu tabloya satır eklenmemesi yeterlidir; yabancı anahtar zorunluluğu kampanyayı engellemez.
  - `status`: `'draft'` durumu enum / check constraint içinde zaten mevcuttur.
  - `campaigns_force_draft_on_insert` trigger'ı: `INSERT` anında `status`'ü otomatik olarak `'draft'` veya geçerli bir `scheduled_at` varsa `'scheduled'` yapmaktadır.
- **Sonuç:** Veritabanında **hiçbir kısıtlayıcı constraint bulunmamaktadır!** Sıfır hedefli (`source_list_ids = []`) ve sıfır hatlı (`campaign_accounts` boş) bir taslak veritabanına sorunsuz yazılabilir. Dolayısıyla DB migration'a gerek yoktur; sorun tamamen server action ve UI validasyonunun katılığıdır.

### 2.3. P0 — Hızlı Taslak Kaydetme (Save Draft Anywhere / Header Action) Eksikliği
- **Mevcut Davranış:**  
  Kullanıcı taslağı kaydetmek için mutlaka 7 adımdan (`kampanya` -> `alicilar` -> `gorsel` -> `mesaj` -> `gonderen` -> `onizleme` -> `yayinla`) geçip son adımdaki kartlardan "Taslak" seçeneğini seçmek zorundadır.
- **Beklenen Davranış:**  
  Kullanıcı kampanya adı veya mesajını girdiği herhangi bir adımda (örneğin Adım 1 veya Adım 4'te) "Taslağı Kaydet" diyerek sunucuya gerçek bir `campaigns` kaydı açabilmelidir.

### 2.4. P1 — Video Önizleme ve WhatsApp Preview Kusurları
- **Mevcut Davranış:**  
  `campaign-preview.tsx` içindeki `CompactWaPreview` bileşeninde yalnızca `<img>` etiketi bulunmakta, video desteği (`<video>`) bulunmamaktadır:
  ```tsx
  {mediaUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={mediaUrl} alt="" className="wb-wa-phone-media" />
  ) : null}
  ```
  `campaign-wizard-ui.tsx` içindeki `WaPreview`'da video desteği eklenmiş olsa da modal önizlemede video gösterilememektedir.
- **Düzeltme:** Hem modalda hem de wizard önizlemesinde video medya türü ve `<video controls playsInline>` desteği eksiksiz sağlanmalıdır.

### 2.5. P1 — AI Metin Üretiminde Kullanıcı Metnini Ezme ve F5 Sorunu
- **Mevcut Davranış:**  
  `campaign-wizard.tsx` (satır 211-221) `useEffect` içinde sayfa açılır açılmaz `generateCreativeMessage` otomatik çağrılmakta; eğer kullanıcı daha önce metin yazmışsa veya F5 atılmışsa `saved?.body` üzerine AI yanıtı yazılabilmektedir.
- **Düzeltme:** Yalnızca `body` tamamen boş olduğunda ve daha önce üretilmediğinde otomatik öneri getirilmeli; kullanıcının yazdığı metin asla ezilmemelidir.

---

## 3. Mimari Düzeltme Stratejisi

1. `actions.ts`:
   - `createCampaign` ve `updateCampaign` içinde `isDraft` (`startMode === 'draft'`) kontrolü ayrılacak.
   - Taslak modunda: `listIds.length === 0` ve `accountIds.length === 0` kabul edilecek.
   - Yayın / planlama modunda (`startMode === 'now' | 'schedule'`): en az 1 grup ve en az 1 bağlı hat zorunlu olmaya devam edecek.
   - Hiçbir şekilde gönderim işi (`campaign.start`, `campaign.refresh_targets`) taslak kaydında kuyruğa ATILMAYACAK.
2. `campaign-wizard.tsx`:
   - `validateStep`: 'alicilar' ve 'gonderen' adımlarında eğer kullanıcı taslak kaydetmek istiyorsa hata fırlatmayacak.
   - Her adımdan erişilebilir güvenli "Taslak Olarak Kaydet" aksiyonu.
   - Çift tıklama ve mükerrer kayıt koruması (idempotency token / submitting guard).
3. `campaign-preview.tsx`:
   - `CompactWaPreview` bileşenine `messageType` prop'u ve `<video>` oynatma desteği eklenecek.
