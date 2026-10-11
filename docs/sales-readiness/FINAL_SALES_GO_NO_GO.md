# Sales GO/NO-GO — Final Acceptance Decision (Updated Audit)

> 2026-10-11 — POST-CODE-AUDIT & VERIFICATION REPORT.  
> Worktree: `codex/sales-readiness`  
> Branch: `codex/sales-readiness`  
> Baseline: `384a579` -> Updated Commit  
> Master Bot worktree (`whatsapp-codex-real-e2e-v2`) and customer `/icerik` files untouched. No unapproved production restarts, real credit charges, or customer dispatches.

---

## 1. Nihai Satış Kararı: NO-GO (Canlı Dağıtım ve Rotasyon Engelleri)

Kritik kod denetimi ve derinlemesine testler sonrasında tüm P0/P1 yazılımsal açıklar yerel kodda çözülmüş ve doğrulanmış olmasına rağmen, **canlı ortama henüz migrasyon uygulanmadığı, canlı Gateway yamalanmadığı ve SEC-03 anahtar rotasyonu tamamlanmadığı için pilot satış kararı KESİN NO-GO'dur.**

| Kabul Seviyesi | Nihai Karar | Gerekçe ve Detaylar |
|---|---|---|
| **PILOT READY (3–5 Müşteri)** | **NO-GO** | **Yazılımsal Durum:** P0-1 (Stripe past_due askı hatası), P0-2 (Gateway X-Tenant-Id header bypass'ı) ve P0-3 (Gerçek PostgreSQL RLS & Backend Hat Gate'i) kod düzeyinde 100% çözüldü ve test edildi.<br>**Canlı Engeller (Blockers):**<br>1. **SEC-03 Credential Rotation (AÇIK P0):** Operatörün Supabase API anahtarları, DB şifresi ve Gateway token'ını dashboard'dan sıfırlaması zorunludur.<br>2. **Canlı Gateway Deploy (AÇIK P0):** Gateway güvenlik patch'leri canlı VPS'e henüz deploy edilmedi.<br>3. **Veritabanı Migrasyonu (AÇIK P0):** `20261011123000_stripe_webhook_atomic_ledger.sql` canlı Supabase'e henüz uygulanmadı. |
| **GROWTH READY (10–15 Müşteri)** | **NO-GO** | Mevcut VPS'te 3.72 GiB RAM bulunmaktadır. 10–15 aktif Baileys soket oturumu ve browser worker'ları eşzamanlı çalıştığında Linux OOM riski vardır. RAM en az 8–16 GiB'a çıkarılmalı ve servisler ayrıştırılmalıdır. |
| **COMMERCIAL READY (30–50 Müşteri)** | **NO-GO** | Çoklu worker sharding, bağımsız Redis/RabbitMQ kuyruğu ve dedicated DB connection pooler yapılandırması tamamlanmadan 30–50 müşteriye ölçeklenemez. |

---

## 2. Kapatılan P0 Hataları ve Doğrulama Kanıtları

### A. P0-1 — Stripe past_due / unpaid Gönderim Kilidi Hatası Düzeltildi
* **Düzeltme:** 
  - `route.ts` içinde `past_due` ve `unpaid` durumlarının yanlışlıkla `downgrade = true` atanması kaldırıldı.
  - `apply_stripe_subscription_atomic` SQL saklı yordamında `past_due` ve `unpaid` durumlarında `suspended_at` derhal atanacak ve kilit asla silinmeyecek şekilde güncellendi.
  - Abonelik kimliği uyuşmazlığı (`subscription_id mismatch`) koruması eklendi: Eski iptal edilmiş bir aboneliğe ait gecikmiş event'lerin güncel aktif aboneliği bozması engellendi (`skipped_mismatched_subscription`).
  - Eksik `event.created` durumu güvenli ISO zaman damgasına bağlandı.
  - Gerçek Next.js `POST(request)` route işleyicisi ve RPC -> PostgreSQL tam zinciri test edildi.
* **Test Sonucu:** `tests/stripe_real_postgres_webhook.test.js`: **10 / 10 PASS**.

### B. P0-2 — Gateway X-Tenant-Id Auth Bypass Düzeltildi
* **Düzeltme:**
  - İstemcinin doğrudan gönderdiği `X-Tenant-Id` başlığı tek başına asla yetkilendirme sayılmaz (`UNAUTHENTICATED_TENANT_HEADER` - 401). Yalnızca yetkili master/worker bearer token taşıyan iç çağrılar kabul edilir.
  - Tenant sahipliği sunucu tarafında doğrulanır. Sahibi çözülemeyen veya bilinmeyen medyalar kesinlikle fail-closed olarak reddedilir (`TENANT_OWNER_UNRESOLVABLE` - 403).
  - `MEDIA_SIGNING_SECRET` bulunmadığında hardcoded fallback salt kaldırıldı; açık 500 yapılandırma hatası üretilir.
  - Gateway yeniden başlatılsa (restart) dahi dosya sahipliğinin kaybolmaması için disk sidecar (`.owner`) desteği eklendi.
  - Safari ve Chrome için video HTTP 206 Range streaming tam olarak korundu.
* **Test Sonucu:** `services/omnistudio/gateway/test/media_tenant_security.test.js`: **11 / 11 PASS**.  
  Tüm Gateway Testleri: **127 / 127 PASS**.

### C. P0-3 — Gerçek PostgreSQL RLS ve Kampanya Backend Gate'i Doğrulandı
* **Düzeltme:**
  - Gerçek PostgreSQL ilişkisel tablolarında `ENABLE ROW LEVEL SECURITY` ve `FORCE ROW LEVEL SECURITY` aktif edildi.
  - Supabase `authenticated` rolü ve `request.jwt.claim.sub` bağlamında ayrı kullanıcı oturumlarıyla (`asUser`) çapraz tenant testleri yapıldı: Tenant B, Tenant A verilerini okuyamaz (0 satır), güncelleyemez (0 satır) ve Tenant A adına veri ekleyemez (RLS ihlali hatası).
  - Kampanya gönderiminde gerçek backend güvenlik kapıları test edildi:
    * WhatsApp hattı `pairing`, `disconnected` veya `is_locked` durumundaysa kampanya gönderimi engellenir (`Seçilen hatlar bağlı ve gönderime açık olmalı.`).
    * İşletme askıdaysa (`suspended_at != null`) `enqueueJob` kampanya dispatch'ini derhal kilitler (`İşletme askıda. Gönderim ve kampanya işlemleri kapalı.`).
    * Yalnızca hat bağlı ve işletme aktifken işlem onaylanır.
* **Test Sonucu:** `tests/real_new_tenant_e2e.test.js`: **4 / 4 INTEGRATION_PASS**.

---

## 3. Test ve Tip Doğrulama Matrisi

| Test Paketi | Kapsam | Sonuç |
|---|---|---|
| `tests/stripe_real_postgres_webhook.test.js` | past_due, unpaid, trialing, checkout, out-of-order, route integration | **10 / 10 PASS** |
| `services/omnistudio/gateway/test/media_tenant_security.test.js` | header spoofing, cross-tenant, tampered sig, restart recovery, range 206 | **11 / 11 PASS** |
| `services/omnistudio/gateway/test/*.test.js` | Tüm OmniStudio Gateway entegrasyon ve güvenlik testleri | **127 / 127 PASS** |
| `tests/real_new_tenant_e2e.test.js` | Gerçek PostgreSQL RLS, Tenant izolasyonu, WhatsApp hat gate, askı gate | **4 / 4 INTEGRATION_PASS** |
| `@wa/service` Testleri | WhatsApp core, single-flight probe, socket reconnect | **63 / 63 PASS** |
| `@wa/service` Typecheck | TypeScript derleme doğrulaması | **0 HATA (PASS)** |
| `@wa/customer` Typecheck | Next.js müşteri uygulaması tip doğrulaması | **0 HATA (PASS)** |
| `scripts/check_secrets.js` | Git stage secret güvenlik tarayıcısı | **0 İHLAL (PASS)** |

---

## 4. Satış Öncesi Zorunlu Operatör Kontrol Listesi (Canlı Engeller)

Sisteme ilk ödemeli müşteriyi almadan önce aşağıdaki 3 canlı operasyonel adım tamamlanmalıdır:
1. **SEC-03 Credential Rotation:** `docs/sales-readiness/SEC03_CREDENTIAL_ROTATION_RUNBOOK.md` dökümanındaki adımlarla Supabase ve Gateway anahtarlarını sıfırlayın.
2. **Supabase Migrasyonu:** `supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql` dosyasını Supabase Dashboard SQL Editor'de çalıştırın.
3. **Gateway Deploy:** Güncellenen Gateway servislerini canlı sunucuya deploy edin.
