# Wizard tanıtım biçimleri ve güvenli indirme

Branch: `codex/wizard-reference-download`. Başlangıç: `374c0381d8bd309ccb275e3712533784cc9a044e`.

## Tanıtım modeli

Mevcut CreativeStudioV2 / Wizard V3 ekranı iki tanıtım biçimi sunar:

- **Ürün / Hizmet Tanıtımı:** fiziksel ürün fotoğrafı, gerçek yazılım ekran görüntüsü veya gerçek hizmet/mekân/çalışma görseli; ayrı işletme logosu. Logo ürün referansı sayılamaz. Mevcut byte/hash tabanlı aynı-logo koruması korunur.
- **Marka Tanıtımı:** yalnız işletme logosu, kayıtlı işletme adı, açıklaması ve kurumsal kimlik üzerinden görsel reklam. Ürün kataloğuna kayıt eklenmez; prompt içinde ürün kimliği uydurulmaz. Ürün seçimi ve fiyat alanları gizlenir. Marka videosu mevcut sağlayıcının ayrı gerçek referans koşulu nedeniyle UI ve backend'de kapalıdır. Logo çoğaltılarak koşul karşılanmaz.

Eski snapshot'lar varsayılan ürün/fiziksel moduna döner. Yeni alanlar mevcut JSON snapshot içinde saklanır; tablo değişikliği veya migration gerekmez. Marka taslakları aktif işletme ve boş hero-product kimliği ile doğrulanır.

Tasarım mevcut Studio kartları, tipografi ve renklerini korur. Refero skill'in yerel referans klasörü bulunmadığından mevcut ürün ekranı tasarım referansı olarak kullanıldı; genel bir yeniden tasarım yapılmadı. Teknik sağlayıcı terimleri müşteriye gösterilmez.

## İndirme zinciri

`CreativeDownload` → aynı origin HEAD ön kontrolü → native tarayıcı indirmesi → `/api/creatives/[creativeId]/download`.

Endpoint gerçek Supabase Auth kullanıcısı, aktif işletme üyeliği, creative sahibi ve çıktı sahibi doğrular. Admin/monitor cookie oturum yerine geçmez. İstemci URL veya storage key veremez. Kütüphane kartları, detay üst menüsü ve görsel menüsü aynı bileşeni kullanır.

Görseller authenticated Supabase client ile private `creatives` bucket'ından kısa süreli imzalanır; key aktif tenant namespace'inde olmalıdır. Video yalnız persisted, onaylanmış ve doğrulanmış output kimliğinden alınır. FINAL `file_path` seçilir; RAW `storage_url` alias'ı kullanılmaz. Gateway URL server-owned path'ten üretilir; mevcut `filename:tenant:expiry` HMAC sözleşmesi korunur.

Gerekli server-only ayarlar: `MEDIA_SIGNING_SECRET` (mevcut kurulum uyumluluğu için `OMNISTUDIO_GATEWAY_TOKEN` fallback), `OMNISTUDIO_GATEWAY_URL` / `AI_GATEWAY_URL`. Supabase URL ve publishable key mevcut auth yapılandırmasıdır; indirme route'u service-role anahtar kullanmaz. Gizli Gateway anahtarı browser'a iletilmez.

Dosya geçici özel diske parçalar halinde yazılır; hash, boyut ve format imzası doğrulandıktan sonra aynı doğrulanmış dosya stream edilir. Video tamamı RAM'e alınmaz. Sınırlar: görsel 25 MiB, video 512 MiB, upstream 120 saniye. Bu yaklaşım indirme başlamadan doğrulama gecikmesi ve geçici disk kapasitesi gerektirir. Container/serverless ortamı yeterli geçici disk sağlamalıdır. Normal tamamlanma ve hata durumunda geçici dosya temizlenir; process crash sonrası orphan temp dosyaları için host bakım politikası gerekir.

Yanıt `Content-Disposition: attachment`, doğru MIME, güvenli UTF-8 dosya adı, `no-store` ve `nosniff` taşır. UUID hatası 400, oturumsuz 401, işletme erişimi 403, yabancı/eksik creative 404, hazır olmayan 409, onaysız FINAL 422, bütünlük hatası 502 verir. UI HEAD hatasını açıklayıcı toast ile gösterir. HEAD başarılı olduktan sonraki GET sırasında oluşan hata tarayıcı indirme hatası olur; uygulama başka storage sitesine yönlenmez.

Image Fix Bot'un Gateway dosyaları ve mevcut playback endpoint'i **değiştirilmedi**. İleride Gateway owner registry/signature ayarı değişirse aynı tenant/path HMAC sözleşmesiyle entegrasyon doğrulanmalıdır. Var olan video playback Range 206 yolu korunur.

## Tekrar doğrulama

```powershell
npm.cmd run typecheck --workspace @wa/customer
npm.cmd run build --workspace @wa/customer -- --webpack
$env:TSX_TSCONFIG_PATH='apps/customer/tsconfig.json'
node --import tsx --test tests/creative-download.test.ts tests/creative-promotion-policy.test.ts tests/creative-studio-v3.test.ts apps/customer/src/lib/creative/video-delivery.test.ts apps/customer/src/lib/creative/variation-context.test.ts apps/customer/src/lib/creative/video-job-duplicate-reference.test.ts apps/customer/src/lib/creative/required-image-assets.test.ts
```

Browser runner: `scripts/verify-wizard-download.mjs`. İzole local app, Chrome, ffprobe ve mevcut yetkili test hesabı gerekir. `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` yalnız environment üzerinden verilir; script içinde credential yoktur. Wizard UI kontrolü için development app'te `STUDIO_V3_UI_FIXTURE=1` gerekir. Runner production host hedefini reddeder, yeni ücretli üretim yapmaz ve tenant kayıtlarını değiştirmez.

Güncel kanıt ve kapsam sınırları: [ACCEPTANCE.md](ACCEPTANCE.md).

Bu branch'in local sonuçları production aktivasyonu veya lansman GO kararı değildir. Production deploy ve main merge yapılmaz; mevcut denetim bulguları korunur.
