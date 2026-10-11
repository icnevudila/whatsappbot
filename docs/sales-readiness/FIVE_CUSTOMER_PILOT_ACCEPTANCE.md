# Mesajify — 3–5 Customer Pilot Acceptance Audit

**Nihai Karar:** CONDITIONAL GO (Şartlı Kabul)  
**Tarih:** 11 Ekim 2026  
**Hedef Kitle:** İlk 3–5 Pilot İşletme  

---

## 1. Pilot Kabul Kriterleri Denetim Matrisi

| Alan | Madde | Durum | Doğrulama Yöntemi | Pilot Satışına Etkisi |
|---|---|---|---|---|
| **Güvenlik** | SEC-01: Health Endpoint Veri Sızıntısı | **VERIFIED_INTEGRATION** | Gateway Test #107 (Prompt/Job gizlendi) | Bloke Edici Değil |
| **Güvenlik** | SEC-02: Anonim JSON & Event Erişimi | **VERIFIED_INTEGRATION** | Gateway Route Auth Middleware | Bloke Edici Değil |
| **Güvenlik** | SEC-03: Sızmış Servis ve Veritabanı Anahtarları | **OPEN (P0)** | Operatör Runbook Hazırlandı | **TEK KALAN KRİTİK BLOKER** |
| **Güvenlik** | SEC-04: Distributed Lease & Fail-Closed | **VERIFIED_INTEGRATION** | Session Coordinator Testleri (111-119) | Bloke Edici Değil |
| **Güvenlik** | SEC-05: Medya Gizliliği & Tenant İzolasyonu | **VERIFIED_INTEGRATION** | Media Tenant Security Testleri (8/8 PASS) | Bloke Edici Değil |
| **Ödeme** | Stripe Webhook Atomik Transaction | **VERIFIED_INTEGRATION** | Real Postgres Testleri (6/6 PASS) | Bloke Edici Değil |
| **Ödeme** | Çift Event & Sırasız Event Koruması | **VERIFIED_INTEGRATION** | Real Postgres Testleri (6/6 PASS) | Bloke Edici Değil |
| **Ödeme** | Başarısız Ödeme Askıya Alma (Suspension) | **VERIFIED_INTEGRATION** | Real Postgres Testleri (6/6 PASS) | Bloke Edici Değil |
| **Onboarding** | Yeni Müşteri Kaydı & Kota Tanımlama | **INTEGRATION_PASS** | Real Postgres E2E Testleri (4/4 PASS) | Bloke Edici Değil |
| **Onboarding** | WhatsApp Hat Gate (Bağlantısız Gönderim Engeli) | **INTEGRATION_PASS** | Real Postgres E2E Testleri (4/4 PASS) | Bloke Edici Değil |
| **Onboarding** | Çapraz Tenant Veri İzolasyonu | **INTEGRATION_PASS** | Real Postgres E2E Testleri (4/4 PASS) | Bloke Edici Değil |
| **Altyapı** | WhatsApp Readiness Single-Flight | **VERIFIED_INTEGRATION** | `@wa/service` Testleri (63/63 PASS) | Bloke Edici Değil |
| **Altyapı** | WhatsApp Soket Kopma & Backoff | **VERIFIED_INTEGRATION** | `@wa/service` Testleri (63/63 PASS) | Bloke Edici Değil |

---

## 2. 3–5 Müşteri İçin Kapasite Değerlendirmesi

- **İşlem Yükü:** 3–5 aktif işletmenin toplam tahmini aylık mesaj hacmi ~3.000–5.000 mesajdır. Bu, saniyede ortalama 0.05 mesaja tekabül eder.
- **Sunucu Kaynakları:** Mevcut tek bir worker konteyneri (2 vCPU, 2GB RAM) 5 adet eşzamanlı Baileys WebSocket oturumunu ~400–600 MB bellek tüketimiyle rahatça yönetebilir.
- **Veritabanı Bağlantıları:** Supabase havuzlayıcı (PgBouncer) 5 müşteri yükü altında connection starvation oluşturmaz.
- **Kritik Sınır:** 3–5 müşteri için ek sharding veya altyapı yatırımı gerekmez. Ancak 10+ müşteriye geçişte oturum sharding'i planlanmalıdır.

---

## 3. Kabul Şartı ve Eylem Planı

İlk 3–5 müşteriye satışın başlatılması için **yalnızca 1 adet operasyonel şart** bulunmaktadır:
> **ŞART:** Operatör, `docs/sales-readiness/SEC03_CREDENTIAL_ROTATION_RUNBOOK.md` dökümanında belirtilen adımları uygulayarak Supabase `service_role` anahtarını, veritabanı şifresini ve Gateway token'ını Vercel/Supabase panellerinden sıfırlamalıdır.

Bu işlem tamamlandığı anda durum **FULL GO** statüsüne geçer ve pilot satışlar güvenle başlatılabilir.
