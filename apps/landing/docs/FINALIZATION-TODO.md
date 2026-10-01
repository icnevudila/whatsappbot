# Mesajify — birleşik uygulama listesi

30 Eylül 2026. Kaynak: Premium Upgrade, Custom Modules, Visual Lab V2, Composition V3, Signature Visuals V3, Finalization Pass ve Official Brand Mark briefleri.

## Kapsam ve sıra

Sonraki briefler önceki çelişen maddeleri geçersiz kılar. Mevcut sayfa mimarisi korunur; yeni ana bölüm, tasarım yönü veya AI medya üretimi yapılmaz. Bofe ana hikâyedir. Signature görseller önce Visual Lab'de incelenir; yeni görsel dil otomatik olarak landing'e aktarılmaz. Resmî marka varlıkları mevcut landing'e uygulanabilir. Uygulama paneli ve canlı deployment bu işin dışında kalır.

## Yapılacaklar

- [x] Yedi briefi okuyup kapsamı birleştir.
- [x] Mevcut sayfa, bileşenler, gerçek medya ve çalışma ağacını incele.
- [x] Resmî tam logo ve sembolü kaynak rasterden kayıpsız, şeffaf kırp; piksel eşitliğini doğrula.
- [x] Ortak `MesajifyMark` bileşenini ekle; navbar/footer ve marka çekirdeklerini güncelle.
- [x] Marka sembolünü seyahat eden Signal'dan ayır; sahte balon/M/logoları kaldır.
- [x] Visual Lab'i yalnızca sekiz Signature V3 önizlemesine indir; replay, açık/koyu, desktop/mobile ve yazısız inceleme ekle.
- [x] Creative: tarama → maske → 9:16 çerçeve → ortam → işlem aşamaları → video.
- [x] Routing: kuyruk → sembol → paket → Hat 03 durur → paket yavaşlar/yön değiştirir → Hat 04 tepki verir.
- [x] Validation: belge → tarayıcı → satır sonucu → temiz/hariç yığın → hazır sonucu.
- [x] Reply: teslim → bekleme → yazıyor → yanıt → kaldırma → yolculuk → satır/unread/mesaj → Inbox odağı; bir kez + replay.
- [x] Journey: tek kıvrımlı yol, asimetrik büyük ürün anları ve yalnızca geçerli aşamanın odağı.
- [x] Sector: seçim tüm video/mesaj/teslim/yazıyor/yanıt sırasını yeniden başlatsın.
- [x] Explorer: gerçek ekran, maskeli geçiş, gecikmeli en çok üç odak annotation'ı.
- [x] Bento: dört kısa, tek olay içeren 4–6 sn döngü.
- [x] `content/sectors.ts` ve `content/product-screens.ts` ile konfigürasyonu ayır.
- [x] `content/media-slots.ts` ve `docs/ASSET-SLOTS.md` oluştur; kesin hedefler, boyutlar, araçlar, durum ve kısıtları yaz.
- [x] Navbar, hero kopyası/motion, FAQ, CTA ve footer bağlantılarını final briefine göre temizle.
- [x] Gerçek medya/poster fallbacks, lazy load, Save-Data ve reduced-motion davranışlarını kilitle.
- [x] 1440 / 1280 / 1024 / 768 / 430 / 390 px kontrolü; klavye, tab/accordion ARIA, kontrast ve odak kontrolleri.
- [x] Production build; LCP/CLS/INP yerel ölçümü ve ölçüm sınırlarını raporla.
- [x] Tam sayfa %25 incelemesi, 3 saniye testi ve kalan medya listesi.

## Tamamlanma kuralı

Kod değişikliği, yerel test, görsel inceleme ve canlı deployment ayrı durumlar olarak raporlanır. Kanıtı olmayan bir kontrol tamamlandı sayılmaz. Final medya üretimi bu aşamada başlatılmaz. Yeni Signature görsellerin landing entegrasyonu, Visual Lab incelemesinden sonra yapılır.


## Final uygulama kaydı
Landing'in mevcut mimarisi kilitlendi. Sekiz Signature modülü labda REVIEW durumunda; kullanıcı onayı verilmiş gibi APPROVED işaretlenmedi. Yeni Signature görsel dili ana sayfaya topluca taşınmadı. Finalization kapsamındaki gerçek ekran odakları, marka ve hero sırası ana sayfada tamamlandı.

27 aktif medya/görsel dosyası build öncesi doğrulanıyor. Sekiz mevcut MP4 ffprobe ile H.264 / 9:16 / 8 sn doğrulandı. Yedi final video ve poster slotu pending; brief gereği üretim başlatılmadı.

Yukarıdaki kontrol maddeleri uygulama ve yerel incelemenin yapıldığını belirtir; her cihaz/yardımcı teknoloji için sertifikasyon anlamına gelmez. Yerel performans ölçümü, test kanıtları ve doğrulanmayan sınırlar FINALIZATION-REPORT.md içinde ayrı yazılıdır.

## 1 October 2026 — narrative correction
Completed locally; see NARRATIVE-CORRECTION.md for current scope and evidence. Earlier finalization reports remain snapshots of the preceding pass. Former SVG sources are preserved per user preference.
