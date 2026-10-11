# DURABLE DRAFT PERSISTENCE — MESAJIFY CAMPAIGN STUDIO V1

## 1. Taslak Kaydetme Paradigması (P0 Çözümü)

Önceki mimaride kampanya oluşturma (`createCampaign`) ve güncelleme (`updateCampaign`) akışlarında kişi listeleri (`lists`) ve gönderici WhatsApp hatları (`accounts`) zorunlu tutuluyordu. Bu durum, yalnızca kampanya mesajını veya görselini hazırlayıp taslak olarak kaydetmek isteyen işletmeler için kritik bir engel oluşturuyordu.

Campaign Studio V1 ile bu ayrım kesin olarak gerçekleştirildi:

### Taslak Kaydetme Modu (`start_mode: 'draft'`)
- **Yalnızca Kampanya Adı Zorunludur:** İşletme adını belirlediği anda taslak kaydedebilir.
- **Kişi Grupları Opsiyoneldir:** `source_list_ids` boş dizi (`{}`) olarak kaydedilebilir.
- **Gönderen Hatlar Opsiyoneldir:** `campaign_accounts` tablosuna satır eklenmek zorunda değildir.
- **Mesaj ve Medya Opsiyoneldir:** Henüz mesaj yazılmamış olsa bile taslak kalıcılaştırılabilir.
- **Sıfır İletişim / Sıfır Job:** Hiçbir WhatsApp gönderim işi (`campaign.refresh_targets`, `campaign.start`, `campaign.resume`) enque edilmez.

### Gönderim Hazırlığı / Planlama Modu (`start_mode: 'now' | 'schedule'`)
- En az bir hedef kişi grubu zorunludur.
- En az bir aktif WhatsApp hattı zorunludur.
- Mesaj veya medya zorunludur.
- Eksik hedefle gönderim girişimi hem client-side hem de server-side reddedilir.

---

## 2. Gerçek Veritabanı Kalıcılığı

`localStorage` yalnızca tarayıcı çökmesine karşı anlık yedekleme katmanı olarak tutulmuş; birincil kalıcılık tamamen PostgreSQL `campaigns` tablosuna taşınmıştır:

```sql
INSERT INTO campaigns (
  org_id,
  created_by,
  name,
  body,
  body_b,
  ab_percent,
  media_url,
  creative_id,
  message_type,
  source_list_ids,
  min_delay_seconds,
  max_delay_seconds,
  daily_cap_per_account,
  status
) VALUES (
  '4a58b0dd-0931-4901-880a-686457d15010',
  'e0784e2d-b636-4b31-8c72-dadd021adec3',
  'Taslak Kampanya test_cams_1791748547122',
  'Özel Kampanya Mesajı...',
  '',
  0,
  NULL,
  NULL,
  'text',
  '{}',
  15,
  35,
  200,
  'draft'
) RETURNING id;
```

---

## 3. Doğrulanan Dayanıklılık ve İdempotency Senaryoları

- **Gerçek ID Üretimi (CAM-08):** Taslak kaydedildiği an gerçek bir UUID oluşur ve URL `/kampanyalar/[id]?taslak=1` adresine yönlenir.
- **Job Enqueue Olmaması (CAM-10):** Taslak kaydı sonrasında `jobs` tablosu sorgulanmış ve kampanyaya ait 0 adet iş oluştuğu DB seviyesinde teyit edilmiştir.
- **F5 / Sayfa Yenileme Dayanıklılığı (CAM-11):** Taslak düzenleme sayfasında yapılan F5 yenilemesinde girilen veriler tamamen korunur.
- **Yeni Oturum / Temiz Tarayıcı (CAM-12):** Çerezler ve yerel hafıza temizlenip yeni bir tarayıcı oturumundan giriş yapıldığında taslak veritabanından eksiksiz yüklenir.
- **Çift Tıklama / İdempotency Koruması (CAM-16):** Aynı kaydetme eylemi art arda tetiklendiğinde veritabanında mükerrer kayıt oluşmadığı doğrulanmıştır (`before === after`).
- **Mobil Taslak Kaydetme (CAM-29):** Dar ekranlı mobil simülasyonda (390x844) alt bar üzerinden taslak başarıyla kaydedilmiş ve yönlendirilmiştir.
