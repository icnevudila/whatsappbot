# CREATIVE TO CAMPAIGN HANDOFF — MESAJIFY CAMPAIGN STUDIO V1

## 1. Genel Bakış ve Deneyim Akışı

Mesajify Campaign Studio V1, Creative Studio'da (Wizard V3 / Image & Video Engine) üretilen yüksek kaliteli reklam medyalarının doğrudan WhatsApp kampanyasına dönüştürülmesini sağlar.

Kullanıcı akışı:
1. İşletme (ör. Bofe veya Ayvazoğlu), Creative Studio'da ürün görseli veya videosu üretir.
2. Üretim tamamlandığında "Kampanyada Kullan" seçeneğine basar.
3. Sistem `/kampanyalar/yeni?creative_id=<UUID>` adresini açar.
4. `loadCampaignCreativeHandoff` server-side fonksiyonu ile medya doğrulanır ve aktif tenant ile eşleştiği teyit edilir.
5. Wizard otomatik olarak kreatifin formatına göre `message_type` ('image' veya 'video') belirler.
6. Medya URL'si ve AI tarafından üretilmiş başlangıç kampanya metni (`campaignMessage`) editöre yüklenir.
7. Kullanıcı metni dilediği gibi düzenler veya kendi metnini yazar; AI arka planda kullanıcının yazdığı metni ezmez.

---

## 2. Test Edilen Fixture'lar ve Doğrulama

Gerçek veritabanı üzerindeki aktif işletme fixture'ları kullanılarak doğrulama gerçekleştirilmiştir:

| Fixture | Tenant Adı | Org ID | Medya Türü | Test Edilen Kreatif ID |
|---|---|---|---|---|
| **Bofe Image** | Bofe | `afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc` | Görsel (`image`) | `aefa9578-07ea-56eb-abe5-cc500d638fca` |
| **Bofe Video** | Bofe | `afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc` | Video (`video`) | `d2ede79a-f20b-48d7-baaa-7f0c7c00c273` |
| **Ayvazoğlu Image** | Ayvazoğlu İnşaat | `4a58b0dd-0931-4901-880a-686457d15010` | Görsel (`image`) | `1adaece3-f218-55ee-ad5a-4f0e1492e06e` |

---

## 3. Güvenlik Kontratı ve İzolasyon

- **Server-Side Doğrulama:** `apps/customer/src/app/(panel)/kampanyalar/wizard-data.ts` içindeki `loadCampaignCreativeHandoff(orgId, creativeId)` fonksiyonu:
  - Kreatifin `status === 'ready'` olup olmadığını doğrular.
  - Kreatifin belirtilen `orgId`'ye ait olduğunu (`.eq('org_id', orgId)`) zorunlu kılar.
  - Video formatı için video durumunu teyit eder.
  - Başka bir işletmeye ait kreatif ID'si URL parametresi olarak geçildiğinde `null` döner.
- **Güvenli Hata Gösterimi:** `apps/customer/src/app/(panel)/kampanyalar/yeni/page.tsx` sayfasında, geçersiz veya yabancı bir kreatif sağlandığında kullanıcıya:
  > *"İçerik bulunamadı veya kampanyada kullanıma hazır değil. Kütüphaneden doğrulanmış bir içerik seçin."*
  uyarı bildirimi gösterilir; yabancı medya hiçbir şekilde forma yüklenmez.

---

## 4. E2E Test Kanıtları

- **CAM-01:** Creative ID ile kampanya wizard'ı başarıyla başlatıldı (HTTP 200, wizard formu render edildi).
- **CAM-02:** Doğru işletme bağlamı korundu (`wb_active_org` ve `orgId` teyit edildi).
- **CAM-03:** Medya türü `image` olarak forma otomatik aktarıldı.
- **CAM-04:** Mesaj editörü kreatife ait başlangıç metniyle yüklendi.
- **CAM-05:** Kullanıcı metni serbestçe düzenleyebildi.
- **CAM-17:** Video formatlı kreatif önizleme simülatöründe gerçek `<video>` elementi olarak yüklendi ve oynatıldı.
- **CAM-18:** Görsel formatlı kreatif önizlemede doğru oran ve etiketle gösterildi.
- **CAM-19 & CAM-20:** Olmayan kreatif ID ve yabancı işletmenin kreatif ID'si server-side engellendi (PASS).
