# 🤖 Özel ChatGPT & DALL-E API Entegrasyon Dokümantasyonu

Bu API, Hetzner sunucunuzda çalışan yerel ChatGPT ve DALL-E servisiniz üzerinden dış uygulamalara **OpenAI uyumlu** bir arayüz sunar. Resmi OpenAI API'sine gitmez, **ekstra maliyet veya token ücreti çıkarmaz**.

---

## 📌 Hızlı Başlangıç & Bağlantı Bilgileri

| Parametre | Değer |
| :--- | :--- |
| **Base URL** | `http://167.233.201.31:3456/v1` |
| **API Key (Bearer Token)** | `<YOUR_OMNISTUDIO_API_KEY>` |
| **Desteklenen Modeller** | `gpt-4o`, `gpt-4o-mini`, `chatgpt-4o`, `dall-e-3` |

---

## 1. Metin Sohbeti (Chat Completions)

Resmi OpenAI formatıyla birebir uyumludur.

### Uç Nokta (Endpoint)
`POST http://167.233.201.31:3456/v1/chat/completions`

### Headerlar
```http
Content-Type: application/json
Authorization: Bearer <YOUR_OMNISTUDIO_API_KEY>
```

### İstek Gövdesi (Body)
```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "Sen yardımsever ve kurumsal bir asistansın." },
    { "role": "user", "content": "Müşterilerimize hitaben profesyonel bir karşılama mesajı yazar mısın?" }
  ]
}
```

> **İpucu:** Basit entegrasyonlar için `messages` yerine doğrudan tek satırda `{"prompt": "Mesajınız"}` da gönderebilirsiniz.

### Başarılı Yanıt (Response - HTTP 200)
```json
{
  "id": "chatcmpl-job_ebe64412e2716116",
  "object": "chat.completion",
  "created": 1790516505,
  "model": "gpt-4o",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Değerli Müşterimiz, şirketimize hoş geldiniz. Size nasıl yardımcı olabiliriz?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 14,
    "completion_tokens": 12,
    "total_tokens": 26
  },
  "reply": "Değerli Müşterimiz, şirketimize hoş geldiniz. Size nasıl yardımcı olabiliriz?",
  "success": true
}
```

---

## 2. Görsel Üretimi (Text-to-Image / DALL-E)

### Uç Nokta (Endpoint)
`POST http://167.233.201.31:3456/v1/images/generations`

### Headerlar
```http
Content-Type: application/json
Authorization: Bearer <YOUR_OMNISTUDIO_API_KEY>
```

### İstek Gövdesi (Body)
```json
{
  "prompt": "İstanbul Boğazı gün batımı, 4k ultra gerçekçi fotoğraf",
  "size": "1024x1024"
}
```

### Başarılı Yanıt (Response - HTTP 200)
```json
{
  "created": 1790524081,
  "data": [
    {
      "url": "http://167.233.201.31:3456/outputs/img_job_123.png"
    }
  ]
}
```

---

## 2.1. Referans Görsel / Logo Ekleme (Image-to-Image / Logo & Ürün)

Üretilecek görsele **şirket logosu, ürün fotoğrafı veya stil referansı** ekleyebilirsiniz. İstediğiniz adette görsel gönderebilirsiniz. Hem **HTTP/HTTPS URL**'leri hem de **Base64** formatını destekler.

### Desteklenen Parametreler:
* `referenceImages`: Referans görsel URL'leri veya Base64 dizisi `["https://site.com/logo.png", "https://site.com/urun.jpg"]`
* `logoUrl`: Doğrudan şirket logosunun linki `"https://site.com/logo.png"`
* `productImageUrl`: Doğrudan ürün fotoğrafının linki `"https://site.com/urun.jpg"`
* `images`: Alternatif dizi formatı `["https://..."]`
* `image`: Tekli görsel linki veya base64

### Örnek İstek (Logo ve Ürün Referanslı):
```json
{
  "prompt": "Verilen logoyu sol üst köşeye yerleştir, verilen ürünün lüks bir ofis masasında modern ışıklandırmayla kurumsal reklam afişini tasarla",
  "logoUrl": "https://siteniz.com/medya/logo.png",
  "referenceImages": [
    "https://siteniz.com/medya/urun_fotografi.jpg",
    "https://siteniz.com/medya/stil_ornek.png"
  ],
  "size": "1024x1024"
}
```

> **Not:** Sistem referans görselleri otomatik olarak sunucuda indirip ChatGPT'nin görsel motoruna dosya olarak ekler. ChatGPT bu görselleri referans alarak istenen prompt doğrultusunda yeni tasarımı çizer.

---

## 3. Kod Örnekleri

### A) Node.js / TypeScript (Resmi OpenAI SDK)
```javascript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "http://167.233.201.31:3456/v1",
  apiKey: "<YOUR_OMNISTUDIO_API_KEY>",
});

async function main() {
  // 1. Soru sor / sohbet et
  const chatResponse = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "Sen yazılım uzmanısın." },
      { role: "user", content: "React 19 hakkında 2 cümlelik bilgi ver." },
    ],
  });
  console.log("Cevap:", chatResponse.choices[0].message.content);

  // 2. Görsel üret
  const imageResponse = await client.images.generate({
    prompt: "Geleceğin şehir silüeti, siberpunk",
    size: "1024x1024",
  });
  console.log("Görsel URL:", imageResponse.data[0].url);
}

main();
```

---

### B) Python (Resmi OpenAI SDK)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://167.233.201.31:3456/v1",
    api_key="<YOUR_OMNISTUDIO_API_KEY>"
)

# 1. Metin Sohbeti
completion = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Türkiye'nin başkenti neresidir?"}
    ]
)
print("Yanıt:", completion.choices[0].message.content)

# 2. Görsel Üretimi
image = client.images.generate(
    prompt="Yeşil çimler üzerinde koşan yavru köpek",
    size="1024x1024"
)
print("Görsel:", image.data[0].url)
```

---

### C) cURL / Postman
```bash
# Sohbet İsteği:
curl -X POST http://167.233.201.31:3456/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_OMNISTUDIO_API_KEY>" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Merhaba!"}]
  }'
```

---

## 4. Hazır Masaüstü ve Web Uygulamaları Entegrasyonu

Eğer arkadaşınız **Chatbox, NextChat, LibreChat, TypingMind veya n8n** gibi hazır bir AI arayüzü kullanıyorsa:
1. Uygulama ayarlarında **Model Sağlayıcısı (Provider)** olarak **OpenAI** seçin.
2. **API Host / Base URL** kutusuna: `http://167.233.201.31:3456/v1` yazın.
3. **API Key** kutusuna: `<YOUR_OMNISTUDIO_API_KEY>` yazın.
4. Model adı olarak `gpt-4o` seçin.

Tüm sistem anında bağlanacak ve çalışmaya başlayacaktır!
