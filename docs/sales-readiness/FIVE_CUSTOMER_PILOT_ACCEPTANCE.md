# Mesajify — 3–5 Customer Pilot Acceptance Audit (Updated)

**Nihai Karar:** NO-GO (Canlı Dağıtım ve Anahtar Rotasyonu Tamamlanana Kadar Satış Başlatılamaz)  
**Tarih:** 11 Ekim 2026  
**Hedef Kitle:** İlk 3–5 Pilot İşletme  

---

## 1. Pilot Kabul Kriterleri Denetim Matrisi

| Alan | Madde | Durum | Doğrulama Yöntemi | Pilot Satışına Etkisi |
|---|---|---|---|---|
| **Güvenlik** | SEC-01: Health Endpoint Veri Sızıntısı | **VERIFIED_LOCAL** | Gateway Testleri (Prompt/Job gizlendi) | Yerel Çözüldü |
| **Güvenlik** | SEC-02: Anonim JSON & Event Erişimi | **VERIFIED_LOCAL** | Gateway Route Auth Middleware | Yerel Çözüldü |
| **Güvenlik** | SEC-03: Sızmış Servis ve Veritabanı Anahtarları | **AÇIK (OPEN P0)** | Operatör Runbook Hazırlandı | **CANLI SATIŞ BLOKERİ** |
| **Güvenlik** | SEC-04: Distributed Lease & Fail-Closed | **VERIFIED_LOCAL** | Session Coordinator Testleri | Yerel Çözüldü |
| **Güvenlik** | SEC-05: Medya Gizliliği & X-Tenant-Id Bypass | **VERIFIED_LOCAL** | Header Spoofing Reddi & Signed URL (11/11 PASS) | Yerel Çözüldü |
| **Canlı Dağıtım** | Gateway Güvenlik Patch'leri Canlı VPS | **BEKLEMEDE (PENDING P0)** | Canlı deploy yapılmadı | **CANLI SATIŞ BLOKERİ** |
| **Canlı Dağıtım** | Supabase Atomic Stripe Migrasyonu | **BEKLEMEDE (PENDING P0)** | Canlı DB'ye uygulanmadı | **CANLI SATIŞ BLOKERİ** |
| **Ödeme** | Stripe past_due / unpaid Askı Kilidi | **VERIFIED_LOCAL** | Real Postgres Testleri (10/10 PASS) | Yerel Çözüldü |
| **Ödeme** | Çift Event & Sırasız Event Koruması | **VERIFIED_LOCAL** | Real Postgres Testleri (10/10 PASS) | Yerel Çözüldü |
| **Ödeme** | Abonelik Kimliği Uyuşmazlığı Koruması | **VERIFIED_LOCAL** | Real Postgres Testleri (10/10 PASS) | Yerel Çözüldü |
| **Onboarding** | PostgreSQL Row Level Security (RLS) | **INTEGRATION_PASS** | Real Postgres RLS Testleri (4/4 PASS) | Yerel Çözüldü |
| **Onboarding** | WhatsApp Hat Gate (Bağlantısız Gönderim Engeli) | **INTEGRATION_PASS** | Real Postgres Gate Testleri (4/4 PASS) | Yerel Çözüldü |
| **Onboarding** | Çapraz Tenant Veri İzolasyonu | **INTEGRATION_PASS** | Real Postgres RLS Testleri (4/4 PASS) | Yerel Çözüldü |
| **Altyapı** | WhatsApp Readiness Single-Flight | **VERIFIED_LOCAL** | `@wa/service` Testleri (63/63 PASS) | Yerel Çözüldü |

---

## 2. Satış Başlatılması İçin Zorunlu 3 Canlı Önkoşul

1. **SEC-03 Anahtar Rotasyonu:** Supabase JWT Secret, DB Şifresi ve Gateway Token operatör tarafından güncellenmelidir.
2. **Canlı Gateway Deploy:** `public_output_access.js` ve `server.js` yamaları canlı sunucuya aktarılmalıdır.
3. **Veritabanı Migrasyonu:** `supabase/migrations/20261011123000_stripe_webhook_atomic_ledger.sql` canlı Supabase'e çalıştırılmalıdır.

Bu 3 adım tamamlanana kadar sisteme hiçbir gerçek ödemeli müşteri kabul edilmemelidir.
