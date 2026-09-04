# WhatsApp Toplu Gonderim Paneli

Coklu WhatsApp hesabini tek bir servisten yoneten, kisi listelerini dogrulayip
toplu kampanya gonderen sistem. Panel kapatilsa bile gonderim sunucuda devam eder.

## Mimari

Uc parca var ve ayrilmalarinin somut bir sebebi var:

| Parca | Nerede calisir | Neden |
|---|---|---|
| `apps/panel` (Next.js 16) | Vercel | Kisa omurlu istekler; Vercel'in fonksiyon suresi siniri panel icin sorun degil |
| `apps/wa-service` (Node + Baileys) | VPS, Docker | WhatsApp baglantisi kalici WebSocket ister; sunucusuz ortamda oturum ayakta kalmaz |
| Supabase (Postgres, Auth, Storage, Realtime) | Yonetilen | Oturum durumu, komut kuyrugu ve kira yonetimi tek yerde |

Panel servise **dogrudan konusmuyor**. Her komut `public.jobs` tablosuna bir satir
olarak yazilir; servis `wa.claim_jobs()` ile `FOR UPDATE SKIP LOCKED` kullanarak
isleri alir. Durum degisiklikleri `accounts` / `campaigns` tablolarina yazilir ve
panel bunlari Supabase Realtime ile canli gorur.

```
Panel (Vercel)  --insert-->  jobs  --claim-->  wa-service (VPS)  --->  WhatsApp
     ^                                              |
     |------------- Realtime (accounts, campaigns) --|
```

### Neden servis dogrudan Postgres'e baglaniyor

`wa` semasi Data API'ye kapali: icinde Signal ozel anahtarlari var. Servis bu
yuzden Supabase JS yerine `pg` ile dogrudan baglanir. Ayrica is kuyrugu gercek bir
transaction icinde calismali; PostgREST bunu vermiyor.

Panelde yalnizca publishable key var, secret anahtar panele hic girmiyor.
Butun yetki kontrolu RLS'te.

## Kurulum

### 1. Bagimliliklar

```bash
npm install
```

### 2. Ortam degiskenleri

`.env.example` dosyasini iki yere kopyalayin:

```bash
# Panel
cp .env.example apps/panel/.env.local

# Servis
cp .env.example apps/wa-service/.env
```

Servis icin `DATABASE_URL` gerekiyor. Supabase panelinde **Connect ->
Direct connection** (veya Session pooler) altindaki dizeyi alin ve
`[YOUR-PASSWORD]` yerine veritabani sifrenizi yazin.

### 3. Veritabani

Migrasyonlar `supabase/migrations/` altinda ve uzak projeye zaten uygulanmis
durumda. Yeni bir projeye kurmak icin:

```bash
npx supabase link --project-ref <PROJE_REF>
npx supabase db push
```

### 4. Calistirma

Iki terminal:

```bash
npm run dev:service   # WhatsApp servisi + is kuyrugu + kampanya motoru
npm run dev:panel     # http://localhost:3000
```

Servisin saglik ucu: `http://localhost:8080/health`

Bu uc "servis ayakta mi" demiyor: beklenen canli oturum sayisi ile gercek canli
socket sayisini karsilastirir. Socket'in sessizce olmesi en can sikici ariza
oldugu icin saglik tanimi bu.

## Ilk kullanim

1. `/giris` adresinden kayit olun.
2. **Hesaplar** sekmesinden hesap ekleyin. QR kodu ekranda kendiliginden gorunur
   (Realtime), telefonunuzdan okutun.
3. **Kisiler** sekmesinden numaralarinizi yapistirin. Numaralar E.164'e cevrilir,
   tekrarlar atlanir ve WhatsApp dogrulamasi kuyruga alinir.
4. **Kampanyalar** sekmesinden mesaji yazin, listeleri ve gonderen hesaplari secin,
   baslatin.

## Guvenlik ve ban onlemleri

Bunlar suslemek icin degil; hepsi hesabin kisitlanmasina yol acan somut
mekanizmalara karsilik geliyor.

- **`onWhatsApp()` dogrulama kapisi zorunlu.** Kayitli olmayan numaraya mesaj
  denemek hesap seviyesinde kisit tetikliyor. Sonuc `contacts` tablosunda
  onbellege alinir.
- **Gercek reach-out kotasi okunuyor.** Baileys'in `fetchNewChatMessageCap()` ve
  `message-capping.update` olayi WhatsApp'in "tanimadigi kisiye gonderim" butcesini
  veriyor. Kota dolduysa gonderim durur; tahmin yapilmiyor.
- **463 reach-out time-lock** geldiginde hesap kilitlenir ve bagli kampanyalar
  durdurulur. `fetchAccountReachoutTimelock()` ile bitis zamani da kaydedilir.
- **Isindirma egrisi.** Yeni hesabin gunluk kotasi yasina gore aciliyor
  (ilk gun 10, 3. gun 25, 7. gun 60, 14. gun sonrasi 250).
- **Rastgele bekleme.** Mesajlar arasi sure kullanicinin verdigi aralikta rastgele
  secilir; sabit aralik toplu gonderimi belirgin hale getiriyor.
- **403 / device_removed** durumunda hesap kalici olarak kilitlenir.

## Oturum dayanikliligi

- Auth state Postgres'te (`wa.creds`, `wa.auth_state`). Diske yazan
  `useMultiFileAuthState` kullanilmiyor: kalici disk olmayan ortamda her yeniden
  baslatmada QR okutmak gerekirdi.
- `set()` donmeden once veri kalici olur. Fire-and-forget yazilirsa Signal
  ratchet'i ilerler ama diske inmez; sonraki acilista "Bad MAC" gelir.
- Ayni hesabi iki process sahiplenmesin diye `wa.session_lease` tablosunda
  **epoch citli kira** var. Kira baskasindaysa yazmalar no-op olur (zombi koruma).
  Kiranin *yoklugu* yazmayi engellemez; engellerse yenilenme penceresinde mesru
  guncellemeler kaybolur.
- `SIGTERM`'de sira: yeni is kabul etmeyi kes -> creds flush -> `sock.end()` ->
  **socket kapandiktan sonra** kirayi birak. `sock.logout()` asla cagrilmaz:
  WhatsApp'a `remove-companion-device` gonderip cihazi kalici siler, yani her
  deploy tum hesaplari unlink ederdi.

## Dagitim

### Panel (Vercel)

Vercel projesinde kok dizin olarak `apps/panel` secin. Ortam degiskenleri:

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

### Servis (VPS)

```bash
docker build -f apps/wa-service/Dockerfile -t wa-service .
docker run -d --name wa-service --restart unless-stopped \
  --env-file apps/wa-service/.env \
  -p 8080:8080 \
  wa-service
```

Birden fazla process calistiracaksaniz her birine **farkli `WORKER_ID`** verin.
Ayni kimlikle iki process ayni hesabi sahiplenir ve `connectionReplaced` (440)
dongusu baslar.

## MVP kapsami disinda kalanlar

- Gelen mesaja otomatik yanıt botu (Gelenler salt okuma + kara liste var)
- Paket satin alma / faturalandirma (Stripe)

## Sonradan eklenenler (MVP sonrasi)

- Yerel isletme kesfi: Google Places (`contacts.discover`) + panel Kişiler
- Web lead scraper (`contacts.scrape`)
- Eslestirme kodu (`pairing_pending`)
- Marka kiti (panel satori; `creative.render` job kullanilmiyor)
- Gelenler: Ilgili / Diger ayirma
