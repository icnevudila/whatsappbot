# Mesajify Logo Kullanım Kuralları

## Logo Versiyonları

| Versiyon | Dosya | Kullanım |
|---|---|---|
| **Full (yatay)** | `/logos/mesajify-logo.png` | Navbar, footer, genel kullanım |
| **Squircle icon** | `/logos/mesajify_app_icon_corporate_squircle.png` | Favicon, avatar, küçük kullanım |

## Logo Anatomisi

```
[💬 gülümseyen balon]  mesajify
      ↑                    ↑
  Yeşil gradyan        Siyah bold
  (#25C96F → ...)      Outfit font
```

- **İkon rengi:** Yeşil gradyan (logo dosyasından alınır, CSS'le değiştirilmez)
- **Wordmark rengi:** `#0A0A0A` (açık arka plan) / `#FFFFFF` (koyu arka plan)

## Minimum Boyut

- Full logo: minimum `120px` genişlik
- Icon: minimum `32px` × `32px`

## Clear Space (Koruma Alanı)

Logo çevresinde her yönde minimum `logo yüksekliği × 0.5` boşluk bırakılır.

## Yasak Kullanımlar

❌ Logo rengini değiştirme  
❌ İkon ve wordmark'ı ayrı ayrı kullanma (icon-only hariç)  
❌ Stretch / distort  
❌ Arka plan olmadan şeffaf üzerine düşük kontrastta kullanım  
❌ Logonun üzerine metin veya efekt koyma  
❌ Logo yerine "M" harfi veya emoji kullanma  

## Navbar'da Logo

```tsx
<Image
  src="/logos/mesajify-logo.png"
  alt="Mesajify"
  width={130}
  height={36}
  priority
/>
```
