# Mesajify Görsel Dil

## Estetik Referans

**Linear · Resend · Vercel** estetiğinden ilham alır:
- Beyaz ağırlıklı, nefes alan boşluklar
- Border ağırlıklı (shadow değil)
- Sade, net, hızlı hissettiren
- Gereksiz dekorasyon yok

## Tasarım Prensipleri

### 1. Netlik Her Şeyin Önünde
Her element bir amaca hizmet eder. "Güzel görünsün" için eklenen hiçbir element yoktur.

### 2. Boşluk Aktif Bir Tasarım Aracı
Section padding'ler generözdür (`clamp(80px, 10vw, 140px)`). Sıkışık layout **asla** kabul edilmez.

### 3. Border > Shadow
```css
/* ✅ Doğru */
border: 1px solid rgba(0,0,0,0.08);
box-shadow: none;

/* ❌ Yanlış */
box-shadow: 0 10px 40px rgba(0,0,0,0.15);
```

### 4. Radius Tutarlılığı
```css
--radius-card: 20px;      /* Büyük card'lar */
--radius-button: 10px;    /* Butonlar */
--radius-input: 8px;      /* Input alanları */
--radius-badge: 999px;    /* Pill badge */
--radius-image: 16px;     /* Resim köşeleri */
```

### 5. Renk Ekonomisi
Bir sayfada maksimum 3 renk rol:
1. Arka plan (`#FAFAFA / #FFFFFF`)
2. Metin (`#0A0A0A`)
3. Vurgu (kobalt `#2f5bff` VEYA WhatsApp yeşili `#25D366` — aynı anda ikisi birden değil)

## Bileşen Estetiği

### Card
```css
background: #FFFFFF;
border: 1px solid rgba(0,0,0,0.08);
border-radius: 20px;
padding: 24px;
/* Shadow yok */
```

### Section Arka Planları
- Beyaz bölümler: `#FFFFFF`
- Gri bölümler: `#FAFAFA`
- Koyu bölüm (sadece Kontrol/Güven): `#0A0A0A`
- Renk sırası: Beyaz → Gri → Beyaz → Koyu → Beyaz (zebra ama minimal)

## Yasak Tasarım Pratikleri

❌ Glassmorphism (landing'de)  
❌ Neumorphism  
❌ Neon renk kullanımı  
❌ Büyük kahraman gradyanlar  
❌ Stock fotoğraf (gerçek ürün görseli veya AI üretimi kullan)  
❌ Yuvarlak resim çerçevesi (avatar hariç)  
❌ Çok sayıda farklı icon seti karışımı  
❌ 3 farklı font kullanımı (sadece Outfit + JetBrains Mono)  
