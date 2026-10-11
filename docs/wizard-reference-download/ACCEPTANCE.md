# Kabul kanıtı — 11 Ekim 2026

## Gerçek browser / mevcut medya

İzole değişiklik branch'inin local Next uygulaması (`localhost:3015`), gerçek Supabase test hesabı ve mevcut müşteri çıktıları kullanıldı. Production uygulamasına deploy yapılmadı; devam eden üretim kabul runner'ı kesilmedi. Browser kanıt zamanı: `2026-10-11T17:54:09.852Z`.

| Kontrol | Sonuç / kapsam |
|---|---|
| Gerçek oturum | PASS — mevcut yetkili hesabın giriş ekranından login |
| Bofe native indirme | PASS — diskte PNG; 2.151.799 byte; 1254×1254; sharp ile decode |
| Ayvazoğlu native indirme | PASS — diskte FINAL MP4; 3.204.489 byte; ffprobe H.264, 10.000000 saniye |
| Dosya bütünlüğü | PASS — browser dosyası ve kaynak hash eşleşti |
| Header | PASS — authenticated endpoint GET yanıtında attachment + doğru MIME; body browser dosyasıyla eşleşti |
| Sayfa değişmeden indirme | PASS — iki dosyada da URL aynı kaldı |
| Başka aktif tenant | PASS — Bofe aktifken Ayvazoğlu creative ID indirme 404 |
| Anonim | PASS — session olmayan context 401 |
| Eksik creative | PASS — bulunmayan UUID 404 |
| Playback ve seek | PASS — gerçek video oynatma, 5. saniyeye seek; bytes 100–199 → 206 / 100 byte |
| Marka görseli | PASS — açıkça etiketli UI fixture: ürünsüz logo-only form son kontrole ulaşır; ürün picker yok |
| Fiziksel ürün | PASS — aynı fixture: eksik gerçek ürün referansı ilerlemeyi engeller |
| Marka videosu | PASS — fixture: mevcut desteklenmeyen sağlayıcı için ilerleme kapalı ve açıklama görünür |
| Mobil | PASS — 390 px genişlikte yatay taşma yok |

Runner 10 paralel olmayan kabul sonucu kaydetti; bazı sonuçlar birden fazla assertion içerir. Ham credential içermeyen sonuçlar: [evidence/browser-results.json](evidence/browser-results.json). Gerçek müşteri dosyaları ve ekran görüntüleri git'e eklenmedi; local `tmp/wizard-download-acceptance` klasöründe bulunur.

### Kaynak kimliği / SHA-256

- Bofe creative: `aefa9578-07ea-56eb-abe5-cc500d638fca`; PNG SHA-256: `f5d3606d2b949f7bb48fb6a04bfc1cee09a476f2b42879936401636f2817cf83`.
- Ayvazoğlu creative: `b3fcc6a6-7dbd-40eb-a468-9c0424fd1efc`; persisted output: `e0d66cf9-34c5-4ff8-b527-787c2d4ee8d6`; MP4 SHA-256: `43da113f27957f2f58384c0d205ba3c1ad668dee3afa5fda16469469a72eeca0`.
- Video FINAL basename: `b3fcc6a6-7dbd-40eb-a468-9c0424fd1efc_88ee2172-582d-4c65-8ae5-42946caef845_finished.mp4`.

## Otomatik testler

32/32 test PASS; skip yok. İndirme testleri byte/MIME/hash/filename, FINAL vs RAW seçimi, HMAC tenant/expiry, arbitrary URL/path/traversal, yetkisiz output, onaysız video, SHA/size mismatch, deleted upstream 404, HEAD ve sınırları kontrol eder. Gerçek route kodu auth/session/admin-bypass fixture'larıyla çalıştırılır. Marka action testi gerçek server action kodunu transport/DB doubles ile çalıştırır; doğrulanmış logo-only brand snapshot, boş ürün dizisi, katalog yazımı olmaması ve fiziksel referans reddi doğrulanır. Provider çağrısı başlamadan marka videosu engellenir. Mevcut PGlite V3 ve duplicate-logo/video-delivery testleri de dahil edildi.

**Kapsam sınırı:** deleted upstream 404 ve auth kenar durumları kontrollü otomatik testtir; gerçek müşteri dosyası silinmedi. Yeni ücretli marka görseli/video üretimi yapılmadı. Marka görselinin actual provider render kalitesi bu run tarafından kanıtlanmaz. Gerçek indirme/playback sonuçları yalnız mevcut belirtilen çıktılar için doğrulandı.

## Statik kontroller

Typecheck, final production build ve yeni indirme/policy/draft dosyalarının ESLint sonuçları ayrı kanıt dosyasında kaydedilir. Eski üç arayüz dosyası tam lint temiz değildir: başlangıç commit'inde 9 error / 9 warning mevcut (Studio explicit-any; detail legacy effects/immutability; library render ref). Yeni indirme dosyalarının temiz lint sonucu repository genel lint PASS anlamına gelmez. Bu konuyla ilgisiz eski UI lifecycle davranışları değiştirilmedi.

Gateway diff'i boş; production deploy/main merge yok. Yeni alanlar JSON snapshot içinde, migration gerektirmez. Secrets staged-diff taraması commit öncesinde çalıştırılır.
