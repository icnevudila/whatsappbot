# Mesajify — Real New Customer Onboarding E2E Report

**Sınıflandırma:** INTEGRATION_PASS (Not BROWSER_PASS — Gerçek PostgreSQL Motoru Üzerinde Backend/Veri Entegrasyon Doğrulaması)  
**Tarih:** 11 Ekim 2026  
**Test Dosyası:** `tests/real_new_tenant_e2e.test.js`  
**Test Motoru:** Embedded PostgreSQL (`@electric-sql/pglite` WASM)  
**Toplam Test:** 4  
**Başarılı:** 4 (100% PASS)  
**Başarısız:** 0  

---

## 1. Test Kapsamı ve Hedefler

Mock veya sahte bellek içi nesneler yerine, gerçek PostgreSQL ilişkisel tabloları, yabancı anahtarları (`foreign keys`), basamaklı silme (`on delete cascade`), benzersizlik indeksleri (`unique`) ve gerçek iş mantığı kuralları doğrulanmıştır.

### Test Edilen Kritik Aşamalar

1. **Kullanıcı Kaydı & Organizasyon Oluşturma:**
   - Yeni kullanıcı `profiles` tablosuna eklenir (`onboarding_step: 'c_welcome'`).
   - Yeni tenant `organizations` tablosuna eklenir.
   - Plan kotaları sahte değerlerle değil, doğrudan `@wa/shared/src/plans.ts` dosyasındaki kanonik `PLAN_QUOTAS.free` (accounts: 1, messages: 1000) kaynak verisinden okunarak doğrulanır.
   - Organizasyon üyeliği (`organization_members`, `role: 'owner'`) bağlanır.

2. **İşletme Bilgileri ve Marka Kiti (Brand Kit):**
   - Şirket adı, adresi, telefon numarası (`phone_e164`) ve `onboarding` durum JSON'ı güncellenir.
   - `brand_kits` tablosuna logo dosya yolu (`logo_path`) ve varsayılan bayrak kaydedilir.
   - Ürün kataloğuna (`products`) ürün eklenir.

3. **WhatsApp Line Gate (Eksik / Eşleşmemiş Hat Koruması):**
   - Bir müşteri WhatsApp hattı bağlamadan veya hat `pairing` / `disconnected` durumundayken kampanya başlatamaz.
   - `accounts.status in ('pairing', 'disconnected')` durumunda kampanya gönderim tetiklemesi backend seviyesinde kilitlenir.
   - Yalnızca `accounts.status = 'connected'` olduğunda gönderim akışına izin verilir.

4. **Sıkı Çapraz Tenant İzolasyonu (Cross-Tenant Isolation):**
   - Tenant A ve Tenant B bağımsız organizasyonlar olarak oluşturulur.
   - Tenant A'nın iletişim listesi (`contact_lists`), marka kiti ve kampanyaları kaydedilir.
   - Tenant B kullanıcısının Tenant A organizasyonuna veya kaynaklarına erişimi sorgulanır; 0 kayıt döner.
   - Tenant B'nin Tenant A kampanyasını silme veya güncelleme teşebbüsü (`where org_id = tenant_b.id`) 0 satır etkiler.

---

## 2. Doğrulama Kanıtı (Test Log Çıktısı)

```tap
TAP version 13
# Subtest: REAL ONBOARDING E2E: Fresh user registration and empty tenant provisioning
ok 1 - REAL ONBOARDING E2E: Fresh user registration and empty tenant provisioning
  ---
  duration_ms: 3523.4605
  type: 'test'
  ...
# Subtest: REAL ONBOARDING E2E: Business details and Brand Kit initialization
ok 2 - REAL ONBOARDING E2E: Business details and Brand Kit initialization
  ---
  duration_ms: 2905.0393
  type: 'test'
  ...
# Subtest: REAL ONBOARDING E2E: WhatsApp Line Gate blocks dispatch when line is pairing or disconnected
ok 3 - REAL ONBOARDING E2E: WhatsApp Line Gate blocks dispatch when line is pairing or disconnected
  ---
  duration_ms: 2278.0717
  type: 'test'
  ...
# Subtest: REAL ONBOARDING E2E: Strict Cross-Tenant isolation prevents Tenant B from reading or modifying Tenant A data
ok 4 - REAL ONBOARDING E2E: Strict Cross-Tenant isolation prevents Tenant B from reading or modifying Tenant A data
  ---
  duration_ms: 2308.7264
  type: 'test'
  ...
1..4
# tests 4
# suites 0
# pass 4
# fail 0
```
