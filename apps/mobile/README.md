# Filo Android — Capacitor shell

**Amaç:** Telefondaki deneyim = mobil web paneli (aynı CSS/JS).

WebView canlı panel: `https://whatsappbot-ten-omega.vercel.app`

## APK (hazır)
Debug APK: `apps/mobile/dist/Filo-debug.apk`  
(Yeniden build: `npm run build:apk` — JDK 21 + Android SDK gerekir.)

## Push — sonra (Firebase)
Kod + Vercel `PUSH_DISPATCH_SECRET` hazır. Eksik olan yalnızca Firebase dosyaları:

1. [Firebase Console](https://console.firebase.google.com) → proje oluştur / seç  
2. Android app ekle → package **`app.filo.android`**  
3. İndir → `apps/mobile/android/app/google-services.json`  
4. Project settings → Service accounts → Generate new private key  
   → JSON’u tek satır yap → Vercel `FIREBASE_SERVICE_ACCOUNT_JSON`  
5. Worker `.env`: `PANEL_URL` + aynı `PUSH_DISPATCH_SECRET`  
6. `npx cap sync android` → `npm run build:apk` → yeni APK

Secret taslağı (gitignore): `apps/mobile/.secrets/push.env`

## Smoke
- [ ] Giriş / scroll
- [ ] Kampanyalar / Mesajlar
- [ ] Geri tuşu
- [ ] (FCM sonrası) bildirim → Mesajlar / kampanya
