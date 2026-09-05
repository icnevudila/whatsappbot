# Vercel: dashboard + admin

Monorepo içinde iki ayrı Vercel projesi. Worker Docker/VPS’te kalır.

## Projeler

| Vercel proje | Root Directory | Port (local) | Env |
|--------------|----------------|--------------|-----|
| `filo-dashboard` | `apps/dashboard` | 3001 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_PANEL_URL` |
| `filo-admin` | `apps/admin` | 3002 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

`NEXT_PUBLIC_PANEL_URL`: production panel URL (ör. `https://panel.filo.app`). Onboarding bitince buraya yönlendirir.

## Kurulum (hesap sahibi)

```bash
# Dashboard
cd apps/dashboard
npx vercel link   # Root Directory: apps/dashboard
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx vercel env add NEXT_PUBLIC_PANEL_URL
npx vercel --prod

# Admin
cd ../admin
npx vercel link   # Root Directory: apps/admin
npx vercel env add NEXT_PUBLIC_SUPABASE_URL
npx vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npx vercel --prod
```

## Platform admin yetkisi

Supabase Dashboard → Authentication → Users → kullanıcı → App Metadata:

```json
{ "platform_admin": true }
```

Yalnızca `apps/admin` bu claim ile açılır; müşteri dashboard’una gerekmez.

## Notlar

- Secret / `service_role` Vercel’e konmaz; UI publishable key + RLS / `admin_overview` RPC.
- Monorepo install: `vercel.json` kökten `npm ci` çalıştırır (`@wa/shared` için).
- Panel (`apps/panel`) yerel/geçici ops UI; production müşteri girişi dashboard onboarding → panel URL.
