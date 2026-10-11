# Canlı ortam kontrollü yük bulgusu — 11.10.2026

Kullanıcı ayrı staging olmadığını belirtti ve mevcut satış öncesi ortamda kontrollü yük testini açıkça yetkilendirdi.

Gerçek HTTP isteğiyle Gateway health, WhatsApp readiness ve oturumsuz müşteri giriş sayfası test edildi. Bu kapsam oturum açmış kullanıcıların veya bağımsız işletmelerin uçtan uca kapasitesi değildir.

- 5 eşzamanlı istek: WA readiness P95 2.190 ms; hata yok.
- 10 eşzamanlı istek: WA readiness P95 4.993 ms; hata yok.
- 30 eşzamanlı istek: WA readiness 60/60 timeout; her istekte 8 saniye sınırı. Gateway 60/60 HTTP 200.
- Durdurma eşiği tetiklendi; 50 seviyesi çalıştırılmadı. Müşteri giriş sayfası 30 seviyesinde çalıştırılmadı.
- Sonraki tekil kontrolde WA 200 / 794 ms, Gateway 200 / 27 ms, müşteri girişi 200 / 639 ms. Tam toparlanma süresi ölçülmedi.

Yerel WA sağlık kodu her istekte bağımsız DB/session/queue kontrolü başlatıyor. Yeni single-flight mekanizması eşzamanlı kontrolleri paylaşır, başarılı veya başarısız sonuçları saklamaz; kapanma sırasında drain yanıtı doğrudan üretilir. Darboğazın bu kodla ilişkisi güçlü bir adaydır; çalışan container kaynak eşdeğerliği ve düzeltme sonrası gerçek yük testi olmadan kesin kök neden sayılmamıştır.

Doğrulama: WA testleri 57/57 başarılı; paket typecheck başarılı. Düzeltme yerel worktree içindedir; push/deployment/restart yapılmadı. Canlı düzeltme sonrası kapasite PASS verilmedi.

Kanıtlar: [ilk yük](evidence/live-http-load.json), [sonraki toparlanma kontrolü](evidence/live-http-recovery.json), [WA testleri](evidence/wa-tests-health-flight.tap), [typecheck](evidence/wa-typecheck-health-flight.log).
