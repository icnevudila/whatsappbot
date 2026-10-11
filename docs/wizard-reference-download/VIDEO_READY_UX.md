# Video kullanımı — müşteri incelemesi engelinin kaldırılması

Branch: `codex/wizard-video-ready-ux`; başlangıç `6ffc87181cc0d06ed698afff43dbf0f656e8f476`.

Video detayındaki ürün/logo ve ticari doğruluk checkbox'ları ile bunları yazan server action kaldırıldı. Görsel inceleme akışı bu görevin kapsamında değiştirilmedi. Normal video üretim ekranı teknik QA checklist'i, ham exception ve iş kimliği göstermez. Başarılı çıktıda oynatma/indirme/kampanya kullanımı doğrudan açılır. Ciddi sorun halinde sade bir uyarı ve kampanya kullanım engeli kalır; manuel kutucukla engel aşılmaz.

## Arka plandaki karar

- FINAL output tenant'a ait olmalı; verified, SHA-256, byte size, dosya yolu, süre ve çözünürlük kanıtı gerekir. RAW dosya kabul edilmez. Playback ve indirme endpoint'lerinin mevcut ownership ve byte doğrulaması korunur.
- Geçerli FINAL çıktıda eski `TECHNICAL_VALIDATION_ONLY` veya açıkça `NEEDS_REVIEW / isSevere:false` editorial kararı manuel müşteri onayı gerektirmez. Sesin hedef pencerenin biraz dışına çıkması (`VOICEOVER_TIMING_FAIL`) tek başına ciddi kalite problemi sayılmaz. Bu kayıtlar DB'den silinmez; kalite raporları saklanır.
- `isSevere:true`, critical/severe, blocked/rejected/failed, hard failures, teknik hata listesi veya ciddi başarısız nested QA raporu eski approved=true bayrağını da geçersiz kılar. Ciddi bulgular non-severe parent altında gizlenemez. Bilinmeyen onaysız durumlar otomatik yayınlanmaz.
- Job müşteri view model'i persisted output'a göre hazır gösterilir; ham job durumu arka planda kalır. Eski NEEDS_REVIEW kayıtlarını topluca READY yapan migration yoktur. Kütüphane, detay, job API, download, render reconciliation ve kampanya handoff aynı output politikasını kullanır.
- Simple V5 worker başarılı final + non-severe editorial kararında COMPLETED yayınlar; ciddi ses/kimlik veya logo sunumu hatası engel kalır. Diğer worker yolları dosya doğrulaması başarısızsa hazır creative/job yazmaz. Orijinal ürün/logo asset registry, attachment, byte hash ve finishing doğrulamaları değişmedi.

`services/omnistudio/gateway` dosyaları değiştirilmedi. İndirme imzası ve playback Range davranışı korunur. Worker değişiklikleri yalnız `services/ai-media-control` içindedir; production worker restart/deploy yapılmadı.

## Kabul kanıtı

Gerçek Chrome E2E, izole local uygulama, mevcut yetkili test hesabı ve gerçek Bofe/Ayvazoğlu çıktıları: **14 PASS**. [Ham sonuçlar](evidence/video-browser-results.json).

- Ayvazoğlu FINAL MP4 tarayıcıdan diske indi; kaynak SHA ve indirilen SHA aynı: `43da113f27957f2f58384c0d205ba3c1ad668dee3afa5fda16469469a72eeca0`; 3.204.489 byte, ffprobe H.264 / 10 saniye.
- Oynatma, 5. saniyeye seek ve bytes 100–199 için 206 / 100 byte geçti. Manuel video checkbox'ı yok. Gerçek campaign wizard'ın hidden creative_id / message_type alanları doğru video ile doldu. Kampanya kaydı/gönderim yapılmadı.
- Başka aktif tenant creative indirmesi 404, anonim 401, eksik ID 404. Bofe PNG indirmesi ve SHA eşleşmesi de geçti.
- Açıkça etiketli development fixture'da is_approved=false / teknik başarılı FINAL doğrudan kampanya eylemi sunar. Ciddi QA failed fixture uyarı gösterir, kampanya eylemi ve manual override yoktur. Bunlar yeni sağlayıcı üretimi veya görsel kalite kanıtı değildir.
- Marka/ürün referans modu ve mobil taşma regresyonları geçti.

Browser runner `scripts/verify-wizard-download.mjs`; local target zorunlu, credential environment üzerinden, paid plan/generation ve mesaj-yaz API'leri bloke edilir. Medya dosyaları ve müşteri ekran görüntüleri git'e eklenmedi; local `tmp/wizard-video-ready-acceptance` klasöründe kalır. Fixture ekran görüntüleri görsel olarak incelendi.

**28/28 otomatik test**: release policy, serious failure override, non-severe warning ayrımı, eski review creative'ın hazır map edilmesi, tenant izolasyonu, FINAL/RAW, hash/size, download, Range ve orijinal duplicate-logo koruması. Worker release testleri ciddi ses ve logo hatalarının engellendiğini doğrular.

Build: `services/creative-video-orchestrator` ve `services/ai-media-control` package-local `npm.cmd run build` başarılı. Bağımsız service root workspace değildir; own service lockfile ile `npm.cmd ci --ignore-scripts --workspaces=false` sonrası dependency build yapıldı. Müşteri final production build (`--webpack`) ve `tsc --noEmit` exit 0. Mevcut legacy UI lint borcu önceki raporda açıklanmıştır; policy/download/progress dosyalarının hedefli lint'i temiz.

Production deploy veya main merge yok. Bu local kabul üretimde etkinleşme veya tüm Mesajify lansmanına GO anlamına gelmez. İlgili önceki video manuel inceleme gereksinimi bu ürün kararıyla yerini otomatik release politikasına bırakır; diğer denetim bulguları korunur.
