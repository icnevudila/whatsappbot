# Google Places — ücretsiz kota / faturalama kilidi

Bu projede her keşif **en fazla 1 Places Text Search isteği** ve **en fazla 20 sonuç** yapar.
Panel org başına günde sınırlı arama açar. Yine de Google tarafında kota kilidi koy.

## Cloud Console (zorunlu)

1. [Google Cloud Console](https://console.cloud.google.com/) → projeni seç.
2. **APIs & Services → Credentials** → API key’in:
   - **API restrictions:** yalnız **Places API (New)**
   - **Application restrictions:** mümkünse IP (VPS) veya hiç public web’e verme
3. **APIs & Services → Enabled APIs** → Places API (New) → **Quotas**
   - Text Search (veya ilgili SKU) için **Requests per day** üst sınırını düşük tut  
     Öneri demo: **50–100 / gün** (biz kodda da sıkıyoruz)
4. **Billing → Budgets & alerts**
   - Bütçe: **$1** (veya $0.01)
   - Eşik: %1, %50, %100 → e-posta uyarısı
5. İstersen anahtarı **rotate** et (sohbette paylaşıldıysa) ve eskiyi sil.

Ücretsiz aylık SKU kotası içinde ücret kesilmez; kota/bütçe kilidi aşımı engeller.
