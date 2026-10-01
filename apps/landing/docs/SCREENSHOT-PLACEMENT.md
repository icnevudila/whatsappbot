# Kullanıcı ekran görüntüleri için yerleşim

- Hero: mevcut gerçek kreatif videosu korunur. Ana ürün anlatımı için sonradan ayrı hero medya seçimi yapılabilir.
- Ürün galerisi: Kampanya, Kreatif Stüdyo, Kişiler, Hat Yönetimi, Gelen Kutusu, Raporlar. Mobil ekranlar yatay kaydırma ve önceki/sonraki düğmeleriyle gezilir. Otomatik kaydırma yok.
- Gönderilecek ana ekran ölçüsü: 390x844 veya benzer telefon oranı. Tarayıcı çubuğu olmadan, okunur, gerekli bölüm doluyken alınmalı. Telefon, e-posta ve özel müşteri konuşması görünmemeli.
- Kırpma yapılmaz; object-fit contain. Her slot src/content/approved-screens.ts içinde image:null olarak bekliyor. Kullanıcı görselini gönderdikten sonra onaylı dosyanın yolu bağlanır.
- Journey ve Reply Inbox alanları da aynı onaylı Inbox slotunu kullanır. Önceki gerçek/boş ekranlar bu alanlarda gösterilmez. Ham mobil çekimler docs klasöründe kalır; yayımlanmaz.
- Boş yerler gerçek ürün ekranı gibi gösterilmez; açıkça Ekran görüntüsü hazırlanıyor olarak işaretlenir.
