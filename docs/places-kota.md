# Google Places — ücretsiz kota / faturalama kilidi

Bu projede her keşif **en fazla 1 Places Text Search isteği** ve **en fazla 20 sonuç** yapar.
Panel org başına günde **15** arama açar.

## Otomatik (gcloud)

```powershell
gcloud auth login
gcloud config set project SENIN_PROJE_ID
powershell -File scripts/setup-places-quota.ps1
```

## Elle (Cloud Console)

1. [API key kısıtla](https://console.cloud.google.com/apis/credentials) → yalnız **Places API (New)**
2. [Places API](https://console.cloud.google.com/apis/library/places.googleapis.com) → Enable
3. [Kota](https://console.cloud.google.com/google/maps-apis/quotas) → Places API (New) → günlük **50–100**
4. [Bütçe](https://console.cloud.google.com/billing/budgets) → **$1** + e-posta uyarıları
5. [Metrikler](https://console.cloud.google.com/google/maps-apis/metrics)

Ücretsiz aylık SKU kotası içinde ücret kesilmez; kota/bütçe kilidi aşımı engeller.
