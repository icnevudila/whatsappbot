# Mesajify — Master Bot Backend Integration Notes

**Kime:** Master Bot (Medya, Video Engine & İçerik Kütüphanesi Ekibi)  
**Kimden:** Satışa Hazırlık & Güvenlik Altyapı Botu  
**Tarih:** 11 Ekim 2026  
**Amaç:** İki bot arasındaki kod çakışmalarını önlemek ve yeni güvenlik mimarisini sorunsuz entegre etmek.

---

## 1. Çalışma Alanı İzolasyonu

- Master Bot'un çalışma alanı (`C:\Users\TP2\Documents\whatsapp-codex-real-e2e-v2` ve `apps/customer/src/app/(panel)/icerik/*`) kesinlikle **değiştirilmemiştir**.
- Tüm değişiklikler `C:\Users\TP2\.codex\worktrees\sales-readiness\whatsapp` worktree'si üzerinde yapılmış olup aşağıdaki alanlarla sınırlıdır:
  - `services/omnistudio/gateway/` (Güvenlik ve Medya Erişimi)
  - `apps/customer/src/app/api/billing/webhook/` (Stripe Atomik Webhook)
  - `supabase/migrations/` (İlişkisel Veritabanı Migrasyonları)

---

## 2. Gateway Medya Erişim Değişikliği (SEC-05) ve Frontend Entegrasyonu

### Eski Davranış:
`/outputs/:filename` endpoint'i tüm medya dosyalarını kimlik kontrolü olmaksızın herkese açık sunuyordu.

### Yeni Güvenli Davranış:
Dosyalar artık anonim erişime kapalıdır (`401 Unauthorized`). Medya dosyalarına erişmek için 3 desteklenen yöntem bulunmaktadır:

1. **Yöntem 1 (Önerilen - Güvenli Proxy):**
   - Müşteri paneli frontend bileşenleri medyayı doğrudan Gateway'den değil, mevcut Next.js route'u üzerinden çağırır:  
     `/api/ai-media/outputs/[outputId]`
   - Bu route oturum açmış kullanıcının `org_id` değerini doğrular ve arkadaki Gateway'e sunucu tarafı iç worker yetkisiyle bağlanır.
2. **Yöntem 2 (İmzalı URL - Signed URL):**
   - Doğrudan Gateway'den medya çağırmak gerektiğinde `signMediaAccess(filename, tenantId, secret, ttl)` fonksiyonu ile üretilen imzalı sorgu parametreleri eklenir:  
     `https://gateway.mesajify.com/outputs/image123.png?sig=<hmac>&exp=<timestamp>&tid=<tenantId>`
   - Bu yöntem HTML `<img>` ve `<video>` etiketlerinde özel HTTP başlığı gerektirmeden çalışır.
3. **Yöntem 3 (X-Tenant-Id Başlığı):**
   - API veya XHR çağrılarında `X-Tenant-Id: <tenantId>` başlığı gönderilir.

### Video 206 Partial Content (Range) Desteği:
Video oynatma için `Range: bytes=start-end` başlığı korunmuştur. İmzalı URL ile çağrılan videolarda Safari ve Chrome video kontrolleri kusursuz akış (streaming) yapmaya devam eder.
