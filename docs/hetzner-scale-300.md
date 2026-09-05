# Hetzner 300 hat — scale runbook

CPX22 (4 GB) üzerinde **`--profile scale` açılmaz** (6×50 OOM).  
Önce **Rescale ≥ 32 GB RAM** (CX52 / CCX), sonra:

```bash
cd /opt/whatsappbot
docker compose -f infra/docker-compose.yml --profile small down
# .env: DB_POOL_MAX=2 (worker basina)
docker compose -f infra/docker-compose.yml --profile scale up -d --build
# Health: 127.0.0.1:8081 .. 8086
```

Kontrol:

```bash
for p in 8081 8082 8083 8084 8085 8086; do curl -fsS http://127.0.0.1:$p/ready | head -c 80; echo; done
```

Supabase: `6 worker × DB_POOL_MAX=2 < pooler limiti`.

Detay: [scale-300.md](./scale-300.md), [hetzner-kurulum.md](./hetzner-kurulum.md).
