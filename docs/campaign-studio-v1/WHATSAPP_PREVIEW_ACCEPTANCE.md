# WHATSAPP PREVIEW ACCEPTANCE — MESAJIFY CAMPAIGN STUDIO V1

## 1. Önizleme Mimarisi ve Simülatör Tasarımı

Mesajify Campaign Studio V1, kullanıcıların mesajlarını ve reklam medyalarını gerçek bir WhatsApp sohbet balonunda anlık olarak görebilmelerini sağlayan `WaPreview` ve `CampaignPreviewModal` bileşenlerini sunar.

Önizleme yetenekleri:
- **Gerçekçi WhatsApp Balonu:** 320px genişliğinde, WhatsApp arayüzü renk paleti ve yazı tiplerini kullanan mobil telefon ekranı simülatörü.
- **Dinamik Değişken Desteği:** `{{ad}}` ve `{{name}}` etiketleri güvenli örnek ad olan "Ahmet" ile gerçek zamanlı değiştirilir. Gerçek alıcı verisi önizlemede asla sızdırılmaz.
- **Türkçe Karakter ve Satır Sonu Korunumu:** `whitespace-pre-wrap` ve UTF-8 karakter setleri ile Türkçe özel karakterler (ç, ğ, ı, ö, ş, ü) ve satır sonları bozulmadan sunulur.

---

## 2. Medya Biçimi Desteği

### Görsel Kampanyaları (`message_type: 'image'`)
- `<img>` elementi ile 1:1, 4:5 veya 9:16 oranındaki reklam görseli sohbet balonunun üst kısmında gösterilir.
- Altında mesaj metni ve zaman damgası yer alır.
- CAM-18 testinde Bofe görseli ile doğrulanmıştır.

### Video Kampanyaları (`message_type: 'video'`)
- Video kampanyalarında statik thumbnail yerine doğrudan `<video src={mediaUrl} controls playsInline preload="metadata" className="wb-wa-phone-media" />` elementi render edilir.
- Kullanıcı tarayıcı üzerinden videoyu oynatabilir, durdurabilir ve sesini kontrol edebilir.
- Otomatik indirme başlatmaz (`autoplay` kapalıdır, kullanıcı kontrolündedir).
- CAM-17 testinde Bofe video kreatifi ile doğrulanmış ve ekran görüntüsü kaydedilmiştir (`cam_17_video_preview.png`).

---

## 3. Kabul ve Doğrulama Kanıtları

- **CAM-17 (PASS):** Video kampanyası önizlemesinde `<video>` elementinin yüklendiği ve oynatılabilir durumda olduğu doğrulanmıştır.
- **CAM-18 (PASS):** Görsel kampanyası önizlemesinde `<img>` elementinin yüklendiği ve render edildiği doğrulanmıştır.
- **Ekran Görüntüleri:**
  - `docs/evidence/campaign_studio_v1/cam_17_video_preview.png`: Canlı video önizleme simülatörü.
  - `docs/evidence/campaign_studio_v1/cam_01_creative_open.png`: Görsel kampanyası açılış ekranı.
