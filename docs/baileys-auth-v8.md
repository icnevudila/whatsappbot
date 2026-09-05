# Baileys auth schema v8 hazırlık

Mevcut: `AUTH_SCHEMA_VERSION = 7` (`apps/wa-service/src/auth-store.ts`).
Pin: `@whiskeysockets/baileys@6.7.24` (≥6.7.22 güvenlik yaması).

**v7.0.0-rc\* production’a alınmaz** — RC; staging doğrulanmadan yok.

Baileys major yükseltmesinde auth blob formatı değişebilir. Plan:

1. Pin’li sürümü koru (`6.7.24`) ta ki staging’de v7/v8 doğrulanana kadar.
2. Yeni sürümde `schema_version` kolonunu yükselt; eski hesaplar için:
   - logout + QR yeniden bağla (güvenli yol), veya
   - resmi migrasyon varsa `wa.creds` / `wa.auth_state` dönüştür.
3. `wa.creds.schema_version` filtresi ile “migrate edilmemiş” hesapları admin’de kırmızı göster.

Şimdilik kod yolu: sürüm sabiti 7; yükseltme runbook bu dosyada.
