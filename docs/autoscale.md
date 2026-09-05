# Otomatik worker ölçekleme

Hat talebine göre `desired_workers` Postgres’te tutulur; actuator (noop / docker / webhook) replica sayısını uygular. **HTTP LB yok** — dağıtım `session_lease` + `claim_jobs` affinity ile kalır.

## Formül

```
demand = aktif hatlar (enabled, kilitli değil, status ∈ connected|connecting|qr_pending|pairing_pending)
       + lease’siz pending account.connect işleri
desired = clamp( ceil(demand / capacity), MIN_WORKERS, MAX_WORKERS )
```

`capacity` = `SCALER_CAPACITY_PER_WORKER` veya `MAX_SESSIONS` (varsayılan 50).

## Bileşenler

| Parça | Rol |
|--------|-----|
| `wa.worker_heartbeat` | Her worker boot + interval upsert |
| `wa.scaler_state` | Tek satır: demand / desired / reason |
| `ROLE=scaler` | Demand hesaplar, desired yazar, actuator çağırır |
| Admin `admin_overview.scaler` | demand → desired, canlı heartbeat |

## Compose

```bash
# Solo worker ile çakışmasın
docker compose -f infra/docker-compose.yml stop wa-service

# Scaler + scale edilebilir wa-worker (varsayılan actuator=noop)
docker compose -f infra/docker-compose.yml --profile autoscale up -d --build

# Desired’ı elle uygulamak (noop sonrası)
docker compose -f infra/docker-compose.yml -p filo-wa --profile autoscale \
  up -d --scale wa-worker=N wa-worker
```

- `wa-worker`: `container_name` yok; `WORKER_ID=auto` → entrypoint `worker-$hostname`
- `wa-scaler`: `SCALE_ACTUATOR=noop` (imajda Docker CLI yok). `docker` için host’ta `ROLE=scaler` veya CLI ekleyin; Coolify için `webhook`.

## Env

| Değişken | Varsayılan | Anlam |
|----------|------------|--------|
| `ROLE` | `worker` | `scaler` = sadece kontrol düzlemi |
| `SCALE_ACTUATOR` | `noop` | `noop` \| `docker` \| `webhook` |
| `SCALER_MIN_WORKERS` | `1` | Alt tavan |
| `SCALER_MAX_WORKERS` | `40` | Üst tavan (20k için yükseltin) |
| `SCALER_CAPACITY_PER_WORKER` | `MAX_SESSIONS` | Demand bölücü |
| `SCALER_INTERVAL_MS` | `20000` | Tick aralığı |
| `SCALE_WEBHOOK_URL` | — | webhook actuator |
| `HEARTBEAT_INTERVAL_MS` | `20000` | Worker heartbeat |

Pool kuralı: `desired * DB_POOL_MAX` < Postgres/session pooler limiti.

## Doğrulama

1. `SCALE_ACTUATOR=noop` → hat ekle → `wa.scaler_state.desired_workers` artar; admin Autoscale kartı güncellenir.
2. Host’ta `SCALE_ACTUATOR=docker` → desired 1→2 → ikinci `wa-worker` heartbeat.
3. İki worker aynı hesabı açmaz (lease).

## Sınırlar

- Scaler RAM sihirbazı değil: `MAX_WORKERS` host kapasitesine göre siz set edersiniz.
- K8s HPA ileride aynı `scaler_state.desired_workers` okur.
- Org `accounts_quota` ayrı; scaler **toplam** demand’e bakar.

Elle sabit filo: [scale-300.md](./scale-300.md). SaaS formül: [saas-scale.md](./saas-scale.md).
