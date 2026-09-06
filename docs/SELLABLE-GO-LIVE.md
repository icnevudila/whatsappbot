# Filo satışa hazırlık (SELLABLE GO-LIVE)

Checklist: self-serve org + kota + Stripe + davet + yasal + worker.

## 1) Ortam (Vercel panel Production)

Zorunlu:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (panel kanonik URL; davet + Stripe return)
- `SUPABASE_SERVICE_ROLE_KEY` (davet + Stripe webhook)

Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_STARTER` (veya `STRIPE_PRICE_ID` fallback)
- `STRIPE_PRICE_PRO` / `STRIPE_PRICE_ENTERPRISE` (opsiyonel)
- `STRIPE_WEBHOOK_SECRET`
- Webhook events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Customer Portal’ı Stripe Dashboard’da etkinleştirin

**Kullanmayın:** `STRIPE_DEFAULT_ORG_ID`

Admin:

- `apps/admin` → kullanıcı `app_metadata.platform_admin=true`
- İsteğe bağlı: `NEXT_PUBLIC_PANEL_URL`

Worker (Hetzner):

- `DATABASE_URL`, `WORKER_ID`, `MAX_SESSIONS`, … (`apps/wa-service/.env.example`)

## 2) Auth / güvenlik

- [ ] Supabase Auth: e-posta confirm açık
- [ ] [Leaked password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) açık
- [ ] PITR / günlük backup açık (Pro plan)

## 3) Ürün smoke

1. Yeni kullanıcı kayıt → `/erisim-yok` → ücretsiz org (1 hat / 1000 msg)
2. Kurulum → hat bağla → hızlı gönderim
3. Aylık kota dolunca `message.send` / kampanya durur (`org_send_gate`)
4. Stripe Checkout starter → webhook plan/kota günceller
5. Abonelik sil / past_due → free kota
6. Admin: işletmeyi askıya al → job claim + gönderim kesilir
7. Üye daveti → e-posta → `/davet/{token}` kabul

## 4) Yasal

- [ ] [`/kvkk`](apps/panel/src/app/(marketing)/kvkk/page.tsx) ve [`/kosullar`](apps/panel/src/app/(marketing)/kosullar/page.tsx) şirket ünvanı güncel
- [ ] Destek: `destek@filo.app` (Yardım + footer)

## 5) Bilinçli sınırlar (sonraki sprint)

- MFA / SSO
- Dağıtık rate limit (Upstash)
- Audit log
- `member` RBAC yazma kısıtı (şu an admin/owner yazma; member salt okuma çoğu yerde UI’da)
- DPA / şirket ünvanı metni

## 6) VT güçlendirme (uygulandı)

- `worker_fleet_status` yalnız org lease worker’ları
- `created_by` / `active_org_id` FK index’leri
- `jobs.org_id NOT NULL`
- `campaign_targets` / `creatives` / `message_log` / `jobs` org tutarlılık trigger’ları
- outbound `message_log` unique
- profiles + auto_reply SELECT birleştirme
- retention: jobs 30g · events 90g · message_log 180g
- Owner `delete_organization` + Ayarlar tehlikeli bölge

## Referans migration’lar

- `20260906160000_saas_sellable_hardening.sql` — suspend, kota kapısı, storage org, invite
- `20260906170000_stripe_apply_clear_subscription.sql`
- `20260906180000_admin_overview_suspended.sql`
- `20260906190000_vt_schema_hardening.sql` — fleet scope, indexes, triggers, retention, org delete
