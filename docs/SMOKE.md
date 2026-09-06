# Filo canlı smoke checklist

Kod hazır; bu adımlar production/staging’de elle veya yarı otomatik doğrulanır.

## Önkoşul

- [ ] Vercel Production env: Supabase + `NEXT_PUBLIC_SITE_URL` + Stripe Price/Webhook
- [ ] `NEXT_PUBLIC_LEGAL_ENTITY_NAME` gerçek ünvan
- [ ] Auth e-posta confirm + leaked password protection
- [ ] Hetzner worker ayakta (`/durum` fleet)

## Akış

1. **Kayıt** — yeni e-posta → confirm → `/kurulum` veya `/erisim-yok`
2. **Org** — ücretsiz işletme oluştur (1 hat / 1000 msg)
3. **Hat** — `/hesaplar` QR veya pairing → Bağlı
4. **Gönderim** — `/hizli-gonderim` kısa test mesajı → `/gidenler` / kampanya detay
5. **Kota** — (test) `monthly_message_quota` düşük bas → gate `quota` / 429
6. **Upgrade** — Stripe Checkout starter → webhook plan/kota
7. **Suspend** — admin askıya al → job claim + gönderim kesilir
8. **Davet** — üye e-posta → `/davet/{token}` kabul
9. **Org sil** — sahip Tehlikeli bölge → Stripe iptal denemesi + `/erisim-yok`

## Hızlı HTTP (oturumsuz)

```bash
# Marketing + health
curl -sI https://YOUR-DOMAIN/ | head -1
curl -sI https://YOUR-DOMAIN/kvkk | head -1
curl -sI https://YOUR-DOMAIN/kosullar | head -1
curl -sI https://YOUR-DOMAIN/giris | head -1
```

Oturumlu smoke için panel UI veya Playwright tercih edilir.
