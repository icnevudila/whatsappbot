# Servisi Oracle Cloud Always Free'de calistirma

WhatsApp servisi kalici bir process gerektiriyor: Baileys soketi acik kalmali,
oturumlar bellekte durmali. Vercel bunu yapamaz (fonksiyonlar saniyeler icinde
kapanir), Render'in ucretsiz katmani da yapamaz (15 dakika trafik olmayinca
uyutur, uyandirma her seferinde tum oturumlari sifirdan kurar ve WhatsApp bunu
supheli davranis sayar).

Oracle Cloud Always Free'nin secilme nedeni: **suresiz** ucretsiz, kredi karti
yalnizca dogrulama icin, ve ARM makinesi 4 OCPU + 24 GB RAM veriyor. 50 hat
icin fazlasiyla yeterli (oturum basina ~60 MB).

---

## 1. Hesap ac

<https://www.oracle.com/cloud/free/> -> "Start for free"

- Kredi karti isteniyor ama **ucret cekilmiyor**; yalnizca kimlik dogrulama.
- Ana bolge (Home Region) secerken **Germany Central (Frankfurt)** secin.
  Supabase de Frankfurt'ta olacak; ayni sehirde olmalari veritabani gidis
  donusunu 1-2 ms'ye indiriyor. Bu onemli: kampanya motoru her mesaj icin
  birkac sorgu atiyor.
- Ana bolge **sonradan degistirilemez**, bu adimda dikkat edin.

## 2. Makineyi olustur

Konsol -> Compute -> Instances -> **Create instance**

| Alan | Secim |
| --- | --- |
| Image | Canonical Ubuntu 24.04 |
| Shape | **Ampere / VM.Standard.A1.Flex** |
| OCPU | 4 |
| Bellek | 24 GB |
| Boot volume | 50 GB (varsayilan) |
| SSH | "Generate a key pair for me" -> ozel anahtari indir |

> **Kapasite hatasi alirsaniz:** Frankfurt'ta ARM kapasitesi sik sik doluyor
> ve "Out of host capacity" hatasi verir. Bu normal; birkac saat sonra veya
> gece tekrar denemek genelde is goruyor. Aceleniz varsa OCPU'yu 1, bellegi
> 6 GB yapmayi deneyin, sonradan artirabilirsiniz. En kotu durumda
> `VM.Standard.E2.1.Micro` (AMD, 1 GB RAM) her zaman musait -- kurulum
> scripti o durumda otomatik olarak 4 GB takas alani aciyor, ama 1 GB RAM ile
> en fazla 3-5 hat calistirin.

Ag ayarlarinda **hicbir sey acmaniz gerekmiyor**. Varsayilan yalnizca 22
(SSH) acik gelir ve bu yeterli: servis disari baglanti kuruyor, iceri istek
kabul etmiyor. Panel ile haberlesme Postgres'teki is kuyrugu uzerinden.

## 3. Baglan

```bash
chmod 400 ~/Downloads/ssh-key.key
ssh -i ~/Downloads/ssh-key.key ubuntu@<MAKINE_IP>
```

Windows'ta PowerShell'den:

```powershell
icacls .\ssh-key.key /inheritance:r /grant:r "$($env:USERNAME):(R)"
ssh -i .\ssh-key.key ubuntu@<MAKINE_IP>
```

## 4. Kurulum scriptini calistir

```bash
curl -fsSL https://raw.githubusercontent.com/icnevudila/whatsappbot/main/infra/oracle-setup.sh | bash
```

Script sunlari yapiyor: sistem paketleri, Docker (resmi depo), gerekiyorsa
takas alani, repo klonu ve iskelet bir `.env`. Tekrar calistirilabilir --
yarim kalirsa bastan baslatmak guvenli.

Bitince **SSH'tan cikip tekrar girin** (docker grubu uyeliginin islemesi
icin).

## 5. Veritabani baglantisini gir

```bash
nano ~/whatsappbot/apps/wa-service/.env
```

`DATABASE_URL` satirini Supabase panelindeki **Session pooler** dizesiyle
doldurun (Connect -> Session pooler). Iki tuzak:

- Kullanici adi `postgres.<proje-ref>` bicimindedir, duz `postgres` degil.
  Yanlissa `Tenant or user not found` hatasi alirsiniz.
- Port **5432** (session mode) olmali. 6543 (transaction mode) calismaz:
  oturum deposu prepared statement ve advisory lock kullaniyor.

Kaydet: `Ctrl+O`, `Enter`, `Ctrl+X`.

## 6. Baslat

```bash
cd ~/whatsappbot && bash infra/deploy.sh
```

Script imaji kurar, konteyneri baslatir ve **gercekten sagliki oldugunu
dogrular**. Saglik kontrolu gecmezse sifir disi kod donup son 60 satir
gunlugu basar -- yani bozuk bir dagitim sessizce "basarili" gorunmez.

## 7. Dogrula

```bash
docker logs -f wa-service          # gunlukleri izle
docker ps                          # durum (healthy olmali)
curl -s localhost:8080/health      # saglik ucu
```

Panelden bir hat baglamayi deneyin: Hesaplar -> Bagla. Birkac saniye icinde
QR veya eslestirme kodu gelmelidir. Gelmiyorsa gunlukte sebep yazar.

---

## Gunluk kullanim

```bash
cd ~/whatsappbot

bash infra/deploy.sh                                   # guncelle + yeniden baslat
docker compose -f infra/docker-compose.yml restart      # sadece yeniden baslat
docker compose -f infra/docker-compose.yml down         # durdur
docker logs --tail 200 wa-service                       # son gunlukler
docker stats wa-service                                 # bellek/CPU
```

## Bilinmesi gerekenler

**Makine kapanmaz.** Always Free makineleri Render gibi uyutulmuyor. Ama
Oracle, 7 gun boyunca CPU'su %10'un altinda kalan **ucretsiz** makineleri
"idle" sayip geri alabiliyor. Servis surekli kuyruk yokladigi icin bu esik
normalde asiliyor; yine de makineyi bos bekletmeyin.

**Yeniden baslatma dayanikliligi.** `restart: unless-stopped` sayesinde makine
yeniden baslarsa konteyner kendiliginden kalkar. Oturumlar veritabaninda
tutuldugu icin QR'i tekrar okutmaniz gerekmez.

**Kapanis sirasi onemli.** `stop_grace_period: 45s` bilincli: servis SIGTERM
alinca kimlik bilgilerini yazip soketi `logout` YAPMADAN kapatiyor ve oturum
kirasini birakiyor. Bu sure kisa olursa process zorla oldurulur, kira uzerinde
kalir ve yeni process 60 saniye bosa bekler.

**Tek process kurali.** Ayni `WORKER_ID` ile iki process acmayin. Ikisi de ayni
hatti sahiplenmeye calisir ve WhatsApp tarafinda 440 (connectionReplaced)
dongusu baslar. Compose dosyasi kimligi `oracle-1` olarak sabitliyor.
