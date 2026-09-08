# @wa/channel-worker-kit

Kanal worker’ları için **wa-service** ile aynı özen seviyesinde ortak altyapı.

`tg-service` gold standard referanstır. Diğer kanal servisleri bu kiti kullanacak şekilde taşınmalı; bu pakette yalnızca kit + tg örneği vardır.

## wa-service parity checklist

| Özellik | wa-service | channel-worker-kit |
| --- | --- | --- |
| Typed env fail-fast | `env.ts` | `requiredEnv` / `intEnv` / `assertEnum` / `resolveWorkerId` |
| `WORKER_ID` zorunlu (worker) | ✅ | ✅ |
| pg pool + SSL | ✅ | `createPool` |
| Claim / `SKIP LOCKED` | `wa.claim_jobs` | `claim_channel_jobs` |
| `markDone` / `markFailed` ownership | `claimed_by` check | aynı |
| Job claimed_at heartbeat (45s) | ✅ | ✅ |
| Exponential backoff retry | ✅ | ✅ |
| `NonRetryableJobError` | ✅ | ✅ |
| `DeliveryUncertainError` + `awaitDelivery` | ✅ | ✅ |
| Drain on shutdown | ✅ | `jobLoop.drain` + `runChannelWorker` |
| `/health` vs `/ready` | ✅ | `computeChannelReady` + lifecycle drain flag |
| Worker heartbeat upsert | `wa.worker_heartbeat` | `channel_worker_heartbeat` |
| Sentry optional | ✅ | `monitoring.ts` |
| Stale reclaim | `reclaim_stale_jobs` | `reclaim_stale_channel_jobs` |
| Boot requeue own jobs | ✅ | `requeueOwn` |

## Kullanım (özet)

```ts
import {
  createPool,
  createJobLoop,
  createWorkerLogger,
  runChannelWorker,
  startHeartbeat,
  stopHeartbeat,
  initMonitoring,
  flushMonitoring,
  captureException,
  resolveWorkerId,
} from '@wa/channel-worker-kit'

const workerId = resolveWorkerId('worker')
const logger = createWorkerLogger('tg-service', workerId)
const { query, closePool } = createPool({
  databaseUrl: process.env.DATABASE_URL!,
  poolMax: 10,
  applicationName: `tg-service/${workerId}`,
})

const jobLoop = createJobLoop({
  query,
  workerId,
  channel: 'telegram',
  pollIntervalMs: 2000,
  batchSize: 1,
  staleJobSeconds: 900,
  handle: async (job) => { /* ... */ },
  logger,
})

await runChannelWorker({
  channel: 'telegram',
  workerId,
  createHttpApp: () => createApp(),
  port: 3000,
  getHealth: async () => ({ /* ... */ }),
  jobLoop,
  startHeartbeat: () => startHeartbeat({ query, workerId, channel: 'telegram', intervalMs: 20_000, logger }),
  stopHeartbeat,
  onBoot: async () => {
    await jobLoop.reclaimStale()
    await jobLoop.requeueOwn()
  },
  shutdownDrainMs: 90_000,
  logger,
  flushMonitoring,
  captureException,
})
```

## Mock / test

`MOCK_MODE=true` ve `DATABASE_URL` yokken job loop olmadan senkron HTTP (tg-service örneği). Üretimde `DATABASE_URL` + `WORKER_ID` zorunlu.
