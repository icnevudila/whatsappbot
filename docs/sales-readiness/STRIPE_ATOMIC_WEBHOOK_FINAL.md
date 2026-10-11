# Mesajify — Stripe Atomic Webhook & Transactional Ledger Final Report

**Durum:** VERIFIED_INTEGRATION (Deploy Pending)  
**Tarih:** 11 Ekim 2026  
**Branch:** `codex/sales-readiness`  
**İlgili Dosyalar:**
- `supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql`
- `apps/customer/src/app/api/billing/webhook/route.ts`
- `tests/stripe_real_postgres_webhook.test.js`

---

## 1. Tespit Edilen Kritik Güvenlik ve Bütünlük Açığı (P0)

Eski webhook işleyicisinde (`apps/customer/src/app/api/billing/webhook/route.ts`):
1. **Race Condition Açığı:** Uygulama katmanında önce `SELECT event_id` yapılıyor, event yoksa `apply_stripe_subscription` çağrılıyor, ardından `INSERT event_id` yapılıyordu. Aynı Stripe event'i için eşzamanlı iki HTTP isteği geldiğinde, her iki istek de SELECT aşamasını boş geçerek çift işlem yapabiliyordu.
2. **Sessiz Başarı (Silent Swallowing):** Ledger veya denetim kayıtları başarısız olduğunda try/catch ile hata yutuluyor ve Stripe'a HTTP 200 dönülüyordu. Bu durum, ödemenin tahsil edilip sistemde eksik veya tutarsız kota açılmasına yol açıyordu.
3. **Sırasız Teslimat (Out-of-Order Delivery):** Stripe gecikmeli eski bir event gönderdiğinde (örneğin müşteri Pro'ya yükselttikten sonra eski bir Basic event'i geldiğinde), plan downgrade edilebiliyordu.

---

## 2. Gerçekleştirilen Kod ve Mimari Düzeltmesi

### A. Veritabanı Düzeyinde Atomik RPC (`apply_stripe_subscription_atomic`)
Tüm webhook mantığı tek bir PostgreSQL transaction'ı içinde çalışan atomik saklı yordama taşındı:
```sql
create or replace function public.apply_stripe_subscription_atomic(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_plan text,
  p_status text,
  p_accounts_quota int,
  p_monthly_message_quota int,
  p_monthly_video_quota int,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
```

### B. Güvenlik ve Bütünlük Mekanizmaları
1. **`SELECT ... FOR UPDATE` Row-Level Locking:** Hedef organizasyon kaydı transaction boyunca kilitlenir. Eşzamanlı istekler sıraya girer.
2. **Idempotency Kayıt Garantisi (`stripe_webhook_events`):** Tabloda `event_id primary key` kısıtı vardır. Zaten işlenmiş bir event geldiğinde işlem tekrarlanmaz ve anında `{ "status": "duplicate", "applied": false }` döner.
3. **Out-of-Order Sıra Koruması:** `organizations.stripe_last_event_created_at` kolonu kontrol edilir. Gelen event daha eski bir zamana aitse plan durumu ezilmez, event `skipped_stale` olarak işaretlenir ve `{ "status": "stale_ignored", "applied": false }` döner.
4. **Subscription İptali ve Askıya Alma (Suspension):**
   - `past_due` durumunda `suspended_at` derhal set edilir (`suspend_reason: 'stripe_past_due'`).
   - `active` durumunda `suspended_at = null` yapılarak kısıt anında kaldırılır.
   - İptal durumunda plan otomatik olarak `free` plana düşürülür ve kotalar sıfırlanır.
5. **Fail-Closed Güvencesi:** Migration uygulanmamış bir ortamda webhook çalıştırılırsa, işlem sessizce yutulmaz; HTTP 500 fırlatılarak Stripe'ın exponential backoff ile tekrar denemesi sağlanır.

---

## 3. Doğrulama Özeti

Gerçek PostgreSQL çekirdeği (@electric-sql/pglite) üzerinde çalışan `tests/stripe_real_postgres_webhook.test.js` test paketi:
- **Eşzamanlı Çift İstek Testi:** 1 uygulandı, 1 duplicate olarak güvenle reddedildi.
- **Sırasız Eski Event Testi:** Güncel Pro planı korundu, eski event yutulmadan loglandı.
- **Başarısız Ödeme Askıya Alma Testi:** `suspended_at` aktifleşti.
- **Ödeme Başarısı Restorasyon Testi:** Askı kalktı.
- **İptal Testi:** Free plana döndü.
- **Fail-Closed Testi:** Eksik tabloda hata fırlatıldı.
- **Sonuç:** 6/6 PASS.
