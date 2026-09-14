# OmniStudio Hetzner Cloud 7/24 Kurulum ve Çalıştırma Rehberi

Bu rehber, WhatsApp botunuzun OpenAI DALL-E görsel üretim maliyetlerini sıfırlayan **OmniStudio AI Engine**'i Hetzner Cloud üzerinde 7/24 otonom olarak nasıl çalıştıracağınızı adım adım anlatır.

---

## 1. Hetzner Sunucu Gereksinimleri
- **Önerilen Paket:** Hetzner Cloud `CX22` (2 vCPU, 4 GB RAM) veya `CPX21` (3 vCPU, 4 GB RAM).
- **İşletim Sistemi:** Ubuntu 24.04 LTS.

---

## 2. Sunucuya Docker Kurulumu (2 Dakika)

Hetzner sunucunuza SSH ile bağlanın ve şu komutları çalıştırın:

```bash
# Paketleri güncelle
sudo apt-get update && sudo apt-get upgrade -y

# Docker ve Compose kurulumu
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

## 3. OmniStudio Servisini Ayağa Kaldırma

Sunucuda `services/omnistudio` klasörüne gidin (veya projeyi klonlayın):

```bash
cd services/omnistudio/docker

# Konteyneri derle ve arka planda başlat
docker compose up -d --build
```

Konteyner ayağa kalktığında iki servis otomatik çalışır:
1. **Port 3456:** OpenAI uyumlu REST API Gateway (`http://localhost:3456/v1/images/generations`)
2. **Port 6080:** noVNC Web Ekranı (Sunucudaki Chromium'u canlı izlemek ve hesap açmak için)

---

## 4. İlk Kurulum: ChatGPT ve Gemini'ye Giriş Yapma (Sadece 1 Kere)

Sunucudaki Chromium'a bağlanmak için kendi bilgisayarınızın tarayıcısından şu adresi açın:

👉 **`http://<HETZNER_SUNUCU_IP_ADRESINIZ>:6080/vnc.html`**

1. Ekranda sunucudaki sanal masaüstünü ve açık olan Chromium tarayıcısını göreceksiniz.
2. **ChatGPT sekmesinde:** OpenAI hesabınıza normal şekilde giriş yapın (varsa 2FA kodunu onaylayın).
3. **Gemini sekmesinde:** Google hesabınıza giriş yapın.
4. **Bitti!** Artık noVNC sekmesini kapatabilirsiniz.
   - Giriş çerezleri sunucudaki `./data/profile` dizininde kalıcı olarak saklanır. Sunucu yeniden başlasa bile oturumlar açık kalır.

---

## 5. WhatsApp Botunuza Bağlama

WhatsApp botunuzun `.env` dosyasına şu satırı eklemeniz yeterlidir:

```env
# OmniStudio Gateway Adresi (Aynı sunucudaysa localhost, hariciyse sunucu IP'si)
OMNISTUDIO_GATEWAY_URL=http://localhost:3456
OPENAI_BASE_URL=http://localhost:3456/v1
```

### 🛡️ Sıfır Risk & Otomatik Fallback (Geri Dönüş) Garantisi:
- Sistemde resmi `OPENAI_API_KEY` tanımlı kalmaya devam eder.
- WhatsApp botundan bir görsel talep edildiğinde sistem önce OmniStudio ücretsiz motorunu çağırır.
- Eğer Hetzner sunucusu yeniden başlıyorsa veya tarayıcı sekmelerinden biri kapalıysa, sistem **otomatik ve sessizce resmi OpenAI DALL-E API'sine düşer**. Kullanıcı hiçbir hata görmez, görseli her koşulda üretilir.

---

## 6. Hibrit Model (Evdeki Bilgisayardan Çalıştırma Alternatifi)
Eğer Hetzner sunucusunda tarayıcı çalıştırmak istemiyorsanız:
1. Gateway'i Hetzner'de çalıştırın: `node services/omnistudio/gateway/server.js`
2. Kendi bilgisayarınızda Google Chrome'u açın.
3. `chrome://extensions` sayfasına girin -> **Geliştirici Modu**'nu açın -> **Paketlenmemiş Öğe Yükle** deyin ve `services/omnistudio/extension` klasörünü seçin.
4. Eklenti ayarlarına Hetzner Gateway adresinizi yazın.
5. Bilgisayarınız açık olduğu sürece tüm WhatsApp görselleri evdeki Chrome'unuz üzerinden sıfır maliyetle üretilir!
