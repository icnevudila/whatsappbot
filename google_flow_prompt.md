# Filo — Google AI Flow Instagram video promptları

Instagram Reels / Stories için. Google AI Flow (Veo) içine her videonun **Flow’a yapıştır** bloğunu ayrı ayrı kopyala. Her video 3 sahne × ~8 saniye; Flow’da sahneleri tek tek üret, sonra birleştir.

**Format:** 9:16 dikey, 1080×1920, 24 fps, sinematik fotorealizm.
**Marka:** Filo
**CTA:** `destek@filo.app` · `filo.app`
**Ses:** Türkçe, kadın veya erkek, 28–38 yaş, sakin İstanbul aksanı. Bağırmasın, satışçı gibi konuşmasın.

---

## 0) Flow’a her seferinde ekle (ortak ayarlar)

Flow’da proje ayarı veya her promptun başına:

```
Aspect ratio: 9:16 vertical, native portrait, 1080x1920.
Duration: 8 seconds per shot.
Style: photoreal cinematic commercial, premium Turkish SME brand film, not stock-ad cheesy.
Color grade: cool graphite shadows #0c0e16, paper whites #f3f5f9, cobalt accent #2f5bff, one WhatsApp-green #25D366 signal light. No neon, no purple glow, no lime brutalism.
Framing: keep faces and logos in the center-safe zone. Leave 12% padding top and bottom for Instagram UI.
Camera: one clear move per shot. No whip-pans, no shaky handheld unless specified.
Audio: diegetic room tone + one short Turkish line in quotes if specified. No English voiceover. No music lyrics.
```

**Negatif (her sahnede aynı bırak):**

```
Negative: WhatsApp official logo, Meta logo, distorted UI, unreadable Turkish text, misspelled words, extra fingers, warped phones, spammy red SALE stickers, crypto aesthetic, cyberpunk, comic sans, influencer dancing, jump cuts inside a single 8s clip, subtitles burned in (we add captions later), brand names other than Filo.
```

---

## 1) Ürün brief’i — pazarlamacı dili (her içerikte kullan)

Aşağıdaki metin hem Flow’a “ürün kimliği” olarak hem de caption / senaryo yazdırırken sistem promptu olarak gider.

```
Sen Türkiye’deki KOBİ’ler, satış ekipleri, ajanslar ve zincir işletmeler için çalışan bir performans pazarlamacısısın. Ürün: Filo.

Filo ne işe yarar (tek cümle):
Kendi WhatsApp hatlarını tek panele bağlayan işletme, kişi listesini doğrular, görsel ve mesajı hazırlar, kampanyayı hattı yakmayan hızda arka planda gönderir. Bilgisayar kapalı olsa da gönderim sunucuda devam eder.

Kime konuşuyoruz:
- Perakende, hizmet, eğitim, gayrimenkul, klinik, B2B dağıtım, dijital ajans.
- “Excel’den kopyala, 400 kişiye yapıştır, 3 gün sonra hat kilit” yorgunluğu yaşayan operasyon / pazarlama / satış sorumlusu.
- Resmi WhatsApp API’nin mesaj başı maliyetinden ve şablon onayından kaçınmak isteyen, kendi hattını kullanmak isteyen işletme.
Konuşma dili: sen-li, net, yetişkin. Abartı yok. “Sınırsız gönderim”, “ban yemezsin”, “1 günde 50 bin kişi” YASAK. Filo’nun marka duruşu dürüstlük: asıl iş mesaj atmak değil, hattı ayakta tutmak.

Ne satıyoruz (faydalar, özellik değil):
1. Hattın yarın da açık kalsın. Yeni hat kademeli ısınır (ilk gün 10 → haftalar sonra günde 250). Mesajlar arası rastgele, insanî bekleme. Kota tahmin değil, kaynaktan okunur. Kısıt sinyali gelince o hat durur, diğerleri devam eder.
2. Boşa atılan mesaj bitsin. Listede WhatsApp’ta kayıtsız numara varsa kampanyaya girmez. Kayıtsız numaraya basmak kısıtın en hızlı yoludur; Filo kapıyı kapatır.
3. Operasyon tek ekranda bitsin. QR ile birden fazla hat. CSV / yapıştır / rehberden kişi. Gruplar. Kampanya sihirbazı. AI ile mesaj yaz, AI ile görsel üret, içerik kütüphanesinde sakla. Gelen cevaplar Mesajlar’da. “Çık” diyen kara listede; bir daha yazılmaz.
4. Bilgisayarı kapat, iş yürüsün. Oturum ve kampanya sunucuda. Panel izlemek içindir, gönderim motoru değil.

Özellik envanteri (reklamda en fazla 3 tanesini seç, hepsini sayma):
- Çoklu hat, tek panel, hat başına kota ve durum.
- QR ile bağla; oturum sunucuda kalır.
- Kişi listesi, grup, WhatsApp rehberi aktarımı, numara doğrulama.
- Kampanya: alıcılar → görsel → mesaj (AI yaz / iyileştir) → gönderen hatlar → önizleme → yayınla. Planlı gönderim, A/B metin.
- İçerik kütüphanesi: markaya uygun AI görsel.
- Canlı özet: hatlar, trafik, günün operasyonu.
- Gelen kutusu: sohbet, arama, zaman filtresi, kara liste.
- Panel kapalıyken gönderim devam.
- Mesaj başına ücret yok; sabit paket. Resmi API gibi her konuşma faturalanmaz.

Rakip iddialarına cevap (yumuşak, saldırgan değil):
- “Sınırsız” vaat eden panel ya limiti bilmiyordur ya hattını yakmayı göze almıştır. Bir hat günde en fazla ~250. Kapasite hat sayısıyla büyür.
- Resmi API daha güvende olabilir ama mesaj başı ücret + şablon onayı vardır. Filo sabit maliyet, kendi hat, risk yönetilir.
- KVKK: izinli liste gönderenin sorumluluğu. Filo kara liste ve kayıt verir; yasadışı spam teşvik edilmez.

Ton ve kelime bankası (kullan):
hattını koru · ısındırma · doğrula sonra gönder · arka planda yürür · kota canlı · kara liste · çoklu hat · panel kapalı kampanya açık · insanî tempo · kayıtsız numaraya basma

Yasak kelime bankası:
sınırsız spam, garantili ban yok, hack, numara çal, izinsiz bombardıman, get-rich, 10.000 mesaj 10 dakikada

CTA:
İletişime geç. Hesaplar Filo tarafından açılır; kendi kendine kayıt yok.
destek@filo.app

Görsel dünya:
Türkiye’de gerçek iş yerleri (butik, ofis, klinik karşılama, depo masası, ajans stüdyosu). Laptop’ta sade açık renkli panel (beyaz yüzey, kobalt buton, yeşil “bağlı” nokta). Telefonda jenerik mesaj baloncukları — resmi WhatsApp logosunu kopyalama. İnsanlar 25–45, çeşitli, abartısız giyim. Premium ama sıcak; SaaS reklamındaki cam ofis klonu değil.
```

---

## 2) Video 1 — “Hattını yakma”

**Amaç:** 3 saniyede acı, 15 saniyede Filo’nun farkı.  
**Kanca (ekrana yazılacak, sonradan caption):** `Toplu mesaj kolay. Hattı ayakta tutmak zor.`  
**Hedef:** soğuk izleyici, sorun-farkındalık.  
**Süre:** 3×8 sn ≈ 24 sn.

### Caption (Instagram)

```
Toplu mesaj atmak kolay. Zor olan, üçüncü kampanyadan sonra hattın hâlâ açık olması.

Filo kayıtsız numaraya basmaz. Yeni hattı ısıtır. Kota dolunca durur. Sen paneli kapatsan da gönderim sunucuda yürür.

Hattını yakmak istemiyorsan: destek@filo.app
#filo #whatsappkampanya #kobi #pazarlama
```

### Seslendirme (tek take, sahnelere böl)

1. “Kopyala, yapıştır, gönder. Üç gün sonra hat kilit.”
2. “Filo önce doğrular. Kayıtsız numaraya basmaz. Yeni hattı yavaş yavaş ısıtır.”
3. “Asıl iş mesaj atmak değil. Hattı ayakta tutmak.”

### Sahne 1 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, photoreal cinematic, Turkish small-business commercial.

Night-time cramped back office of a clothing boutique in Istanbul. A tired woman in her early 30s, dark hair in a low bun, simple black knit, sits at a messy desk. Warm practical lamp. On the laptop: an Excel sheet of phone numbers. She highlight-copies a huge block of cells, pastes into a generic phone chat composer, hits send in a rush. The phone on the desk lights up with a cold system warning screen (no readable brand logo, just a lock icon and grey system text). Her face drops. She leans back, rubs her forehead.

Camera: slow push-in from medium to close-up on her face, then a rack focus to the locked phone.

Lighting: warm tungsten vs cold phone glow.

Audio: keyboard clacks, paste shortcut, whoosh of messages firing too fast, then a dull error buzz. She whispers in Turkish, weary, not shouting: "Yine kilitlendi."

Mood: expensive documentary, not comedy, not horror.

End frame: tight close-up of the dark phone face-down on the desk.
```

### Sahne 2 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, same color world as a premium SaaS brand film. Continuity: same woman, now morning, rested, navy shirt.

A clean pale desk. Laptop shows a fictional CRM-like panel named "Filo" — white canvas, cobalt #2f5bff buttons, small green connected dots next to two phone-line rows. Turkish UI labels only if crisp: "Doğrulama", "Bağlı". No WhatsApp logo.

She clicks a verify action. On screen, a list of numbers gets quiet green checks; a few grey rows dim and slide out (unregistered numbers removed). A slim progress bar fills slowly, human pace, not a spam firehose. A second phone on a wireless charger shows a single tasteful product photo message arriving to one customer — not a blast montage.

Camera: over-the-shoulder 35mm, then gentle dolly left to a profile.

Lighting: soft daylight, cobalt reflection on the laptop bezel.

Audio: soft UI ticks, one satisfying check sound. Calm female VO in Turkish: "Önce doğrula. Sonra gönder."

Mood: control, relief, competence.
```

### Sahne 3 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, brand closer.

Same boutique, golden hour. Woman locks the laptop, slings a tote, walks toward the shop door. The laptop lid is closed on the desk; the screen-off machine is clearly left behind. A tiny status LED on a nearby mini server / router blinks cobalt calmly (abstract, not a branded gadget).

Cut to a floating title-safe center card on graphite #0c0e16:
Wordmark feel: a cobalt dot + three shortening horizontal bars (queue emptying), then the word FILO in clean geometric sans.
Under it, one line of elegant Turkish: "Hattını koru."
Then smaller: "destek@filo.app"

Camera: she walks through frame left to right, camera holds on the closed laptop two beats, then match-cut to the dark title card. Slow rise.

Audio: shop door bell, city hush. Confident VO: "Asıl iş, hattı ayakta tutmak. Filo."

No dancing, no logo distortion, no extra text.
```

---

## 3) Video 2 — “Üç adımda yayına”

**Amaç:** ürün nasıl çalışır, somut ve kısa.  
**Kanca:** `QR. Liste. Yayın.`  
**Hedef:** “bu iş için yazılım arıyorum” niyetindeki izleyici.  
**Süre:** 3×8 sn.

### Caption

```
01  Hatlarını QR ile bağla. Oturum sunucuda kalır.
02  Kişileri yükle. WhatsApp’ta kaydı yoksa kampanyaya girmez.
03  Mesajı ve görseli hazırla, yayınla. Paneli kapatsan da gider.

Çoklu hat. Isındırma. Kara liste. AI görsel ve metin.
Hesaplar Filo tarafından açılır → destek@filo.app
```

### Seslendirme

1. “Hatlarını QR ile bağla. Panel kapansa da oturum durmaz.”
2. “Listeyi yükle. Kayıtsızlar elenir. Boşa kota yakılmaz.”
3. “Mesajı yaz, görseli ekle, yayınla. Gönderim arkada yürür.”

### Sahne 1 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, photoreal, Istanbul daylight office, 4-person sales team loft, pale walls, plants, cobalt accent on a mug.

A man 35, short beard, rolled sleeves, holds a modern Android phone vertically. Laptop in front shows a large QR code on a white Filo panel (abstract QR, not a real WhatsApp Web clone, no official logos). He scans. On the laptop, a row labeled with a blurred phone number flips from "QR bekleniyor" to a green status pill "Bağlı". A second and third line in the list already show green dots.

Camera: start on the phone screen in his hands (generic camera viewfinder overlay), tilt up to his slight smile, then pan to the laptop status.

Audio: subtle scan beep. Male VO, calm Istanbul Turkish: "Hatlarını bağla. İstediğin kadar."

Keep UI typography sharp. If text might warp, prefer icons and green dots over long sentences.
```

### Sahne 2 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, same office, same man.

Split-time motion: he drops a CSV file onto the Filo window (paper-white UI). Rows of contacts cascade in. A “WhatsApp doğrula” action runs: green badges appear on most rows, a few rows grey out and get a small x. He filters to "WhatsApp’ta var". Count in the corner ticks from 1840 to 1612 — numbers must stay physically plausible, no 999999.

Optional insert: a clean group named "Eylül vitrin" being selected with a check.

Camera: top-down desk 50mm then push to the screen. Macro of a green check animating.

Audio: paper-soft whoosh of a file land, ticking checks. VO: "Doğrula. Kayıtsızlara basma."

No spreadsheet chaos, no red error spam. Feels like a precision tool.
```

### Sahne 3 — Flow’a yapıştır

```
9:16 vertical, 8 seconds.

Campaign wizard on the laptop: a product still of a ceramic mug / linen shirt (physical product on the desk matches the on-screen image). He types a short Turkish message, then taps a cobalt button "AI ile yaz" — the paragraph gently rewrites to a warmer 2-line WhatsApp-length note. He hits "Yayınla". A live counter: Gönderildi 12, kuyrukta 430, advancing slowly like a human cadence, not a machine gun.

He closes the laptop. Hold on the closed lid. Smash cut to graphite end card:
FILO
"Üç adımda yayına."
destek@filo.app

Camera: screen recording feel but cinematic depth, then pull back.

Audio: one soft publish click. VO: "Yayınla. Gerisi sunucuda." Then silence 0.5s.

On-screen message text if shown, keep very short and correctly spelled Turkish: "Yeni sezon vitrinde. Bugün dükkana uğra."
```

---

## 4) Video 3 — “Panel kapalı, kampanya açık”

**Amaç:** en ayırt edici özellik + çoklu hat kapasitesi. Duygusal vaat: hayata dön, iş yürüsün.  
**Kanca:** `Bilgisayarı kapat. Kampanya durmasın.`  
**Hedef:** ajans, zincir, sahada gezen patron.  
**Süre:** 3×8 sn.

### Caption

```
Eski yöntem: kampanya bitsin diye laptop’u açık bırakmak.

Filo’da oturum sunucuda. Üç hattı sabah bağla, öğlen dükkana in, akşam rapora bak.
Bir hat kısıt alırsa o hat durur, diğerleri devam eder.

Kapasite tek hattı zorlayarak değil, hat sayısıyla büyür.

destek@filo.app
```

### Seslendirme

1. “Eskiden kampanya için bilgisayarı açık bırakırdın.”
2. “Filo sunucuda çalışır. Sen sahadasın, kampanya kendi hızında.”
3. “Bir hat durursa diğerleri devam eder. Akşam raporu hazır.”

### Sahne 1 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, slightly ironic, still premium.

Late night home office. A man 40 in a hoodie, empty tea glass, laptop forced to stay awake. Sticky note on the lid: "KAPATMA — KAMPANYA". Screen shows a crude bulk-sender window firing messages at a rigid metronome. He yawns, afraid to close it. Ceiling fluorescent, ugly but cinematic.

Camera: static wide, then slow creep toward the sticky note.

Audio: loud ticking like a bomb-metronome (tasteful, not cartoon). VO, dry: "Kampanya bitsin diye bilgisayarı açık bırakma."

Do not make him look like a scammer. He looks like an exhausted shop owner.
```

### Sahne 2 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, liberation contrast.

Morning. Same man, now a sharp chore coat, in a bright neighborhood shop / showroom. He glances at a phone notification: Filo — "Kampanya yürüyor · 3 hat · kota uygun". Puts the phone in his pocket. Helps a real customer fold a textile / choose a product. Sunlight, dust motes, life.

Intercut 1 second: a quiet rack of three phones on a charging stand in a back room, each with a tiny green LED. Not blasting, just alive.

Camera: handheld-stable documentary following him from street into shop, 9:16.

Audio: street, doorbell, soft conversation. VO: "Oturum sunucuda. Sen işini yap."

Phones must not show official WhatsApp branding. Generic green bubble UI is ok if abstract.
```

### Sahne 3 — Flow’a yapıştır

```
9:16 vertical, 8 seconds, proof + brand.

Golden hour. He sits at the counter, opens Filo on a tablet. A simple report: three horizontal quota bars (Satış hattı, Destek, Kampanya) — two full cobalt, one shorter amber "ısınma". Funnel numbers that stay readable: gönderildi, teslim, okundu. A replies inbox with one customer saying "ilgileniyorum". He taps the thread, smiles, types a short human reply.

End card on graphite:
FILO
"Panel kapalı. Kampanya açık."
destek@filo.app

Camera: tablet three-quarter, then lift to his face, then cut to title.

Audio: quiet café-shop room tone. VO: "Akşam raporu hazır. Filo."

Keep all on-screen numbers consistent: 250 cap per line, never millions per minute.
```

---

## 5) Çekim sonrası (Flow dışında)

- Altyazı: büyük, Outfit / geometric sans, beyaz + kobalt vurgu. Kelime kelime, ekranın alt %28’ine. Üstte Instagram UI boşluğu bırak.
- Müzik: düşük BPM, analog piano + soft pulse. Söz yok. 1. videoda daha karanlık, 3. videoda daha açık.
- Kapak karesi: her Reels’in 0.0 saniyesini kapak yapma; 2. saniyedeki yüz veya kanca yazısını kapak seç.
- Seri etiketi: üç videoda da aynı kobalt nokta + üç bar işaretini son karede tut; marka hafızası için.
- Yasal duruş: izinsiz ileti / spam vaadi yok. Caption’da “izinli listenle” denebilir.

## 6) Tek satırda üç video fikri (A/B için)

| # | Kanca | Satılan fikir | İzleyici |
|---|---|---|---|
| 1 | Toplu mesaj kolay, hat ayakta zor | Ban önleme / ısındırma / doğrulama | Soğuk trafik |
| 2 | QR. Liste. Yayın. | Ürün turu, 3 adım | Sıcak niyet |
| 3 | Bilgisayarı kapat | Sunucu motoru + çoklu hat | Operasyon / patron |

Flow her sahneyi ayrı üret. Beğenilmeyen sahneyi aynı prompt + “same characters, same wardrobe, same office, slightly slower camera” ile yeniden al. Karakter tutması için Sahne 1’in karesini Ingredients / referans görsel olarak Sahne 2–3’e ver.
