# Hetzner VPS — Filo wa-service

Panel/dashboard Vercel’de kalır. Bu VPS yalnızca WhatsApp worker’ı çalıştırır.

## Küçük / başlangıç VPS (`--profile small`)

Tek worker, **`MAX_SESSIONS=50`**. Places yok — yalnızca oturum + kampanya.

- **4 GB RAM:** 50 hat teorik tavan; dolunca OOM riski yüksek — yavaş doldur, `free -h` izle.
- **8 GB+:** 50 hat daha gerçekçi.
- **300 hat:** sonra plan büyüt → `--profile scale`.

```bash
# Ubuntu
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git curl
sudo usermod -aG docker $USER   # sonra yeniden login

git clone https://github.com/icnevudila/whatsappbot.git
cd whatsappbot

cp apps/wa-service/.env.example apps/wa-service/.env
# DATABASE_URL = Supabase Session pooler (5432)
# WORKER_ID=hetzner-1  (compose small zaten set eder)

# Varsayilan solo'yu acma — small profil kullan
docker compose -f infra/docker-compose.yml --profile small up -d --build

curl -fsS http://127.0.0.1:8080/health
curl -fsS http://127.0.0.1:8080/ready
```

Önerilen `.env` (small / 50 hat):

```
ROLE=worker
WORKER_ID=hetzner-1
MAX_SESSIONS=50
DB_POOL_MAX=2
JOB_BATCH_SIZE=1
LOG_LEVEL=info
NODE_ENV=production
```

2 GB swap (OOM yumuşatma):

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Firewall: dışarıya **8080 açma**. Panel DB üzerinden konuşur. SSH (22) yeter.

## Sonra büyütünce (16–32 GB → 300 hat)

1. Hetzner’de plan yükselt (veya yeni büyük VPS).
2. `small` profilini durdur:
   ```bash
   docker compose -f infra/docker-compose.yml --profile small down
   ```
3. Scale profili:
   ```bash
   docker compose -f infra/docker-compose.yml --profile scale up -d --build
   ```
4. `MAX_SESSIONS=50`, `DB_POOL_MAX=2`, 6 worker → 300 dilim.

Detay: [scale-300.md](./scale-300.md), [worker-contract.md](./worker-contract.md).

## Kontrol listesi

- [ ] `DATABASE_URL` session pooler 5432
- [ ] Tek `WORKER_ID` (çift process aynı id → lease çatışması)
- [ ] Panel’de hat bağla → Durum’da job ilerlesin
- [ ] `/health` → ok; RAM `free -h` ile izle
