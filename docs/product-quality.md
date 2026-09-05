# Filo ürün ve servis iyileştirmesi

## Tasarım hedefi

Türkçe çalışan işletmeler için WhatsApp operasyon paneli. Birincil iş: hat bağlama,
izinli kişi listesi hazırlama, gönderim ve sonuçları takip etme. Mevcut Pilot UI /
Messora Cobalt tasarımı doğrudan uygulama hedefidir.

| Karar | Kaynak | Uygulama |
| --- | --- | --- |
| Açık çalışma alanı, beyaz yüzey, kobalt aksiyon | `chatbot/pilot-ui/docs/design/DESIGN-LANGUAGE.md` | Panel, form ve navigasyon |
| Grafit açılış, tek ürün önizlemesi | Aynı belgenin marketing composition kuralları | Landing ve giriş yan paneli |
| Gruplanmış gezinme, belirgin veri hiyerarşisi | Pilot UI product.css; Twenty ürün örneği | Sabit menü, sayfa üstü, özet kartları |
| Sohbet ve durumların ayrılması | https://www.chatwoot.com/ | Gelenler ve operasyon durumlarını ayrı tutma |
| Gerçek ürün davranışını anlatan metin | Kod incelemesi; Pilot UI honesty kuralları | Desteklenmeyen satın alma ve kesin teslim vaatlerini kaldırma |
| Erişilebilir geri bildirim | Refero ana rehberi | Odak, mobil dokunma alanları, hata/boş/yükleme durumları |

Renk rolleri: `#2f5bff` aksiyon ve odak; `#127a52` başarı; `#0c0e16`
yalnızca marka yüzeyleri. Outfit gövde/başlık, JetBrains Mono sayısal ayrıntı.
10px yüzey, 6px kontrol köşesi. Ürün görseli kodla oluşturulmuş ve açıkça örnek
etiketli önizleme; uydurma müşteri, satış veya canlı veri yok.

## Teknik başvuru

- https://github.com/WhiskeySockets/Baileys — mevcut 6.7.24 bağlantı sürümünü koru.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client — sunucuda doğrulanmış kullanıcı, yönlendirmede yenilenen çerezleri koruma.
- https://supabase.com/docs/guides/auth/passwords — PKCE callback ve şifre kurtarma.
- https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- https://nextjs.org/docs/app/api-reference/file-conventions/error

## İncelemede bulunanlar

- Şifre kurtarma ve doğrulama callback ekranı yok; doğrulama e-postası başarı yerine hata gibi gösteriliyor.
- Proxy yönlendirmeleri yenilenen oturum çerezlerini kaybediyor; `/giris` önek kontrolü gereğinden geniş.
- WhatsApp gönderildikten sonra mesaj önbelleği yazımı hata verirse tekrar gönderim tetiklenebiliyor.
- Gönderim zaman aşımı uzak işlemi iptal etmiyor; kör tekrar çift mesaj oluşturabilir.
- Servis kapanışında aktif kampanya döngüsü yeni hedef almaya devam edebiliyor.
- Günlük ısındırma kuralı panel ve serviste iki farklı kopyada tutuluyor.
- Durum ekranı aynı hattı birden çok kez risk sayabiliyor; kampanya sayısı son 10 kayıtla sınırlı.
- Landing satın alma altyapısı olmayan paketleri ve kesin WhatsApp limitlerini gerçekmiş gibi sunuyor.

## Doğrulama kaydı

Tamamlanan kontroller ve canlı ortamda kalan doğrulamalar çalışma sonunda burada kaydedilir.
Yerel testler gerçek numaralara mesaj göndermez ve canlı oturumları başlatmaz.
