# IMAGE FIX BOT — MASTER BOT ENTEGRASYON VE DEVİR PROTOKOLÜ (HANDOFF)
**Tarih:** 11 Ekim 2026  
**Branch:** `codex/sales-readiness`  
**Son Commit:** `5a37c6a` (`fix(billing): decouple invoice status from subscription status, guard against obsolete subscription events, and verify atomic PostgreSQL transition`)  
**Satışa Hazırlık Kararı:** **NO-GO** (Operatör SEC-03 credential rotasyonunu ve canlı Gateway deployment'ını yapana kadar canlı satış kesinlikle başlatılamaz)

---

## 1. Yönetici Özeti ve Güvenlik/Abonelik Kapanış Durumu

Master Bot'un Wizard V3, yaratıcı medya kütüphanesi ve video üretim akışını tamamlamasının ardından, `codex/sales-readiness` branch'indeki güvenlik, faturalandırma ve çok kiracılı (multi-tenant) çekirdek altyapı düzeltmeleri tamamlanmış ve tam test kanıtlarıyla (`PASS`) doğrulanmıştır:

1. **Stripe Webhook Atomik İşlem & Durum Ayrımı:**
   - **Sorun:** Stripe faturalarında `invoice.status` değerleri (`open`, `paid`, `uncollectible`) dönerken, PostgreSQL abonelik fonksiyonu `past_due`/`unpaid` beklemekteydi. Bu durum, geciken ödemelerde işletmenin askıya alınmamasına (suspension bug) yol açıyordu. Ayrıca `lines.data[0].price.id` çözülemiyordu.
   - **Çözüm:** `apps/customer/src/app/api/billing/webhook/route.ts` içinde `invoice.status` ve `subscription.status` ayrıştırıldı. `invoice.payment_failed` geldiğinde açıkça `past_due` durumuna eşlenerek SQL RPC'ye aktarıldı. `lines` ve `items` fiyat kimlikleri uyumlu hale getirildi.
   - **Migration Güncellemesi:** `supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql` içindeki `apply_stripe_subscription_atomic` fonksiyonunda:
     - Öncelik 1: `invoice.payment_failed` doğrudan gecikme askısına (`suspended_at = now()`, `suspend_reason = 'stripe_past_due'`) bağlandı.
     - Adım 3.5: Eski veya süresi dolmuş bir aboneliğe ait geç gelen Stripe olaylarının (cancellation, failure veya out-of-order update) organizasyonun yeni ve aktif aboneliğini ezmesi engellendi (`skipped_mismatched_subscription`).
   - **Kanıt:** `tests/stripe_real_postgres_webhook.test.js` (10/10 PASS).

2. **Gateway Medya Güvenliği & HMAC Yetkilendirme:**
   - **Sorun:** İstemci tarafından gönderilen sahte `X-Tenant-Id` header'ı ile medya dosyalarına yetkisiz erişim riski vardı.
   - **Çözüm:** `services/omnistudio/gateway/public_output_access.js` içinde istemci başlığı tek başına asla kimlik doğrulama kabul edilmez (`UNAUTHENTICATED_TENANT_HEADER` - 401). Yalnızca yetkili backend tarafından HMAC-SHA256 ile imzalanmış URL'ler (`sig`, `exp`, `tid`) ve iç yetkili worker'lar kabul edilir.
   - **Cross-Tenant İzolasyonu:** İmzalı URL'deki kiracı kimliği ile medyanın disk/bellek mülkiyeti (`.owner` sidecar) uyuşmazsa 403 Cross-Tenant Access Denied döner.
   - **Range 206 Streaming:** Master Bot'un video oynatıcısının ihtiyaç duyduğu kısmi içerik (HTTP 206 Range) desteği imzalı erişimle tam uyumlu çalışır.
   - **Kanıt:** `services/omnistudio/gateway/test/media_tenant_security.test.js` (11/11 PASS).

3. **Multi-Tenant RLS & Kampanya Gönderim Kapısı:**
   - Organizasyon kayıtlarında Free plan kotaları (1 hat, 100 mesaj) atomik uygulanır.
   - Hat bağlantısı kesilmiş, eşleşmede kalmış veya kilitli hatlar üzerinden kampanya başlatılamaz.
   - Ödeme gecikmesi veya ihlal nedeniyle askıya alınan (`suspended_at is not null`) kiracıların kampanya gönderim kuyruğu (`enqueueJob`) reddedilir.
   - **Kanıt:** `tests/real_new_tenant_e2e.test.js` (4/4 PASS).

---

## 2. Entegrasyon Sözleşmesi (Master Bot İçin Gerekli Değişiklikler)

Master Bot, Wizard V3 veya Medya Kütüphanesinden Gateway üzerindeki render edilmiş çıktılara (görseller, mp4 videoları) erişirken veya oynatırken aşağıdaki sözleşmeye uymalıdır:

### A. Medya URL'lerinin İmzalanması
Backend API veya Server Action üzerinden Gateway medyası sunulurken `signMediaAccess` fonksiyonu kullanılmalıdır:
```javascript
const { signMediaAccess } = require('services/omnistudio/gateway/public_output_access');

// Örnek kullanım:
const signed = signMediaAccess({
  filename: 'output_job_123.mp4',
  tenantId: orgId,
  ttlSeconds: 3600 // 1 saat geçerli
});
// Çıktı URL: /outputs/output_job_123.mp4?sig=...&exp=...&tid=...
```

### B. Video Oynatma ve HTTP Range 206 Desteği
İstemci tarafındaki `<video>` veya `<audio>` etiketleri imzalı sorgu parametreleriyle doğrudan Gateway'e istek atabilir:
```html
<video src="http://gateway:8080/outputs/sample.mp4?sig=abc...&exp=1791...&tid=tenant_123" controls />
```
Gateway, `Range: bytes=0-1048575` başlığını tanıdığında HTTP 206 Partial Content döner ve imzayı doğrular.

### C. Gerekli Ortam Değişkenleri (Environment Variables)
Entegrasyon ortamında aşağıdaki değişkenlerin tanımlı olması şarttır:
- `MEDIA_SIGNING_SECRET`: Medya erişim token'larının HMAC-SHA256 imzası için ortak gizli anahtar (Fallback anahtar kaldırılmıştır; atanmazsa sistem fail-closed 500 döner).
- `OMNISTUDIO_GATEWAY_TOKEN`: Gateway dahili worker ve backend proxy iletişimi için Master Token.
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook imza doğrulaması için resmi webhook signing secret (`whsec_...`).
- `NEXT_PUBLIC_SUPABASE_URL` ve `SUPABASE_SERVICE_ROLE_KEY`: Supabase veritabanı ve atomic RPC çağrıları için servis anahtarı.

---

## 3. Canlıya Alma ve Satış Kabulü İçin Operatör Kontrol Listesi (SEC-03 Rotation)

> [!WARNING]
> **Canlı Satış Kararı: NO-GO**  
> Kod seviyesinde tüm P0/P1 hataları giderilmiş ve test edilmiştir; ancak daha önce git geçmişine ve test ortamına girmiş olan gerçek canlı Supabase/Gateway anahtarlarının rotasyonu tamamlanmadan canlı müşteriye satış yapılamaz.

Canlı **GO** kararına geçmek için operatörün tamamlaması gereken adımlar:
1. **Supabase Migration Uygulaması:**
   - `supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql` migrasyonu canlı Supabase veritabanına uygulanmalıdır (`supabase db push` veya Supabase Dashboard SQL Editor).
2. **SEC-03 Credential Rotasyonu:**
   - Canlı Supabase `service_role` anahtarını yenileyin (Rotate Key).
   - Stripe Webhook Signing Secret'ı (`STRIPE_WEBHOOK_SECRET`) yenileyin ve Vercel/Fly.io ortamına ekleyin.
   - `MEDIA_SIGNING_SECRET` için güçlü, rastgele bir 256-bit secret oluşturun ve Gateway ile Müşteri Paneli ortam değişkenlerine tanımlayın.
3. **Canlı Gateway Deployment:**
   - Gateway servisini yeni güvenlik zinciri (`public_output_access.js`) ile kontrollü şekilde yeniden dağıtın.
   - `/health` rotasında hiçbir prompt, job veya müşteri verisinin sızmadığını doğrulayın.

---

## 4. Test ve Kanıt Çıktıları Tablosu

| Test Paketi | Test Edilen Bileşen | Sonuç | Süre |
| :--- | :--- | :---: | :---: |
| `tests/stripe_real_postgres_webhook.test.js` | Atomik Idempotency Ledger, Past Due / Unpaid Suspension, Out-of-order Guard, Obsolete Sub Guard, Route Chain | **10 / 10 PASS** | 52.3s |
| `services/omnistudio/gateway/test/media_tenant_security.test.js` | HMAC Signed URLs, Anonim Bloklama, Tenant Header Spoofing Reddi, Range 206 Streaming, Fail-Closed | **11 / 11 PASS** | 1.6s |
| `tests/real_new_tenant_e2e.test.js` | Tenant İzolasyonu, Free Plan Kota, WhatsApp Hat Durumu Kapısı, Askıya Alınmış Kiracı Kuyruk Blokajı | **4 / 4 PASS** | 24.1s |
| `apps/customer typecheck` | Next.js TypeScript derleme ve tip uyumluluğu (`tsc --noEmit`) | **PASS** | 9.8s |

Master Bot bu raporu ve `codex/sales-readiness` branch'indeki değişiklikleri baz alarak medya/Wizard sisteminin nihai entegrasyonunu tamamlayabilir.
