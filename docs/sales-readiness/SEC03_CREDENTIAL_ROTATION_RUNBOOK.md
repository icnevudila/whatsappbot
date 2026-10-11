# Mesajify — SEC-03 Credential Rotation Operator Runbook

**Öncelik:** P0 (Kritik Satış Engeli)  
**Durum:** OPEN (Operatör Aksiyonu Gerektirir)  
**Tarih:** 11 Ekim 2026  
**Hedef:** Canlı ortama açılmadan ve ilk 3-5 pilot müşteri kabul edilmeden önce sızmış/eski tüm gizli anahtarların sıfırlanması.  
**UYARI:** Bu dökümanda hiçbir gerçek şifre veya API anahtarı yer almaz. Değerler yer tutucu (`<YENI_DEGER>`) olarak verilmiştir.

---

## 1. Neden Bu İşlem Zorunlu? (Kök Neden)

Geçmiş geliştirme ve commit geçmişinde Supabase `service_role` anahtarı, Gateway `OMNISTUDIO_GATEWAY_TOKEN` ve ilgili API erişim bilgileri yer almıştır. Kod düzeltmeleriyle (SEC-01, SEC-02, SEC-04) uygulama katmanında yetkisiz erişim kapatılmış olsa da, sızmış anahtarlar veritabanı ve sunucu düzeyinde doğrudan yetki sahibidir. Bu nedenle **anahtar rotasyonu yapılmadan sisteme gerçek müşteri kabul edilemez**.

---

## 2. Adım Adım Operatör Rotasyon Prosedürü

### Adım 1: Supabase API & JWT Secret Rotasyonu
1. Supabase Dashboard'a giriş yapın -> Proje Ayarları -> **API** sekmesini açın.
2. **JWT Secret** bölümünde `Generate new secret` (veya `Rotate secret`) butonuna tıklayın.
3. Bu işlem eski `anon` ve `service_role` token'larını anında geçersiz kılar ve yeni anahtarlar üretir.
4. Yeni oluşturulan:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   değerlerini güvenli parola yöneticisine kaydedin.

### Adım 2: Supabase Veritabanı Şifresi Rotasyonu
1. Supabase Dashboard -> Proje Ayarları -> **Database** sekmesini açın.
2. `Database password` -> `Reset database password` seçeneğini tıklayın.
3. Güçlü, rastgele en az 32 karakterlik yeni bir şifre belirleyin.
4. Yeni veritabanı bağlantı URI'sini (`POSTGRES_URL_NON_POOLING`, `DATABASE_URL`) güncelleyin.

### Adım 3: OmniStudio Gateway & Worker Token Rotasyonu
1. Terminalde güçlü rastgele bir token üretin:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Bu değeri `OMNISTUDIO_GATEWAY_TOKEN` olarak belirleyin.
3. Vercel ortam değişkenlerinde (`apps/customer`) ve Gateway sunucu konfigürasyonunda güncelleyin.

### Adım 4: Stripe Webhook Signing Secret Rotasyonu
1. Stripe Dashboard -> Developers -> **Webhooks** sekmesini açın.
2. Mevcut endpoint'in yanındaki `...` menüsünden `Roll secret` (veya yeni endpoint oluşturup eskisini silin) seçeneğini seçin.
3. Yeni `whsec_...` değerini `STRIPE_WEBHOOK_SECRET` değişkenine atayın.

### Adım 5: Vercel ve Sunucu Ortam Değişkenlerinin Güncellenmesi
1. Vercel Dashboard -> Project Settings -> **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `<YENI_ANON_KEY>`
   - `SUPABASE_SERVICE_ROLE_KEY` = `<YENI_SERVICE_ROLE_KEY>`
   - `OMNISTUDIO_GATEWAY_TOKEN` = `<YENI_GATEWAY_TOKEN>`
   - `STRIPE_WEBHOOK_SECRET` = `<YENI_STRIPE_WEBHOOK_SECRET>`
2. Canlı deployment için Vercel üzerinde `Redeploy` tetikleyin (Environment cache temizlenmesi için).
3. Gateway servislerini yeni `OMNISTUDIO_GATEWAY_TOKEN` ile yeniden başlatın.

---

## 3. Rotasyon Sonrası Doğrulama Prosedürü

1. **Eski Token İptal Testi:** Eski `service_role` veya Gateway token'ı ile istek atıldığında sistemin `401 Unauthorized` döndürdüğünü doğrulayın.
2. **Yeni Token Kabul Testi:** Yeni token ile `/health` ve authenticated route'ların `200 OK` döndürdüğünü teyit edin.
3. **Müşteri Paneli Girişi:** Müşteri panelinden test kullanıcısı ile oturum açılabildiğini ve veri çekilebildiğini doğrulayın.
4. **Onay:** Yukarıdaki 3 doğrulama tamamlandığında SEC-03 durumu **RESOLVED** olarak işaretlenecektir.
