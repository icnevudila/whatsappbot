import process from 'node:process'
import type { JobLoop } from './jobs.js'
import type { WorkerLogger } from './logger.js'

export type HttpApp = {
  listen: (port: number, host?: string) => Promise<void>
  close: () => Promise<void>
  server: unknown
}

export type DrainState = {
  isDraining: () => boolean
  setDraining: (value: boolean) => void
}

export function createDrainState(): DrainState {
  let draining = false
  return {
    isDraining: () => draining,
    setDraining: (value: boolean) => {
      draining = value
    },
  }
}

export type RunChannelWorkerOptions = {
  channel: string | string[]
  workerId: string
  createHttpApp: () => HttpApp
  port: number
  /** Health payload ureticisi; drain bayragi icin drainState / isDraining kullanin. */
  getHealth: () => Promise<object> | object
  jobLoop?: JobLoop
  startHeartbeat?: () => void
  stopHeartbeat?: () => void
  onBoot?: () => Promise<void>
  shutdownDrainMs: number
  logger: WorkerLogger
  flushMonitoring: () => Promise<void>
  captureException: (e: unknown) => void
  /** Paylasilan drain ref — shutdown'ta setDraining(true). */
  drainState?: DrainState
  onAfterClose?: () => Promise<void>
}

export async function runChannelWorker(opts: RunChannelWorkerOptions): Promise<void> {
  let shuttingDown = false
  const drain = opts.drainState ?? createDrainState()

  const app = opts.createHttpApp()
  await app.listen(opts.port)
  opts.logger.info(
    { port: opts.port, channel: opts.channel, worker: opts.workerId },
    'Kanal worker dinliyor',
  )

  // getHealth createHttpApp icinde kapanmis olmali; referans dogrulama / tip sozlesmesi.
  void opts.getHealth

  if (opts.onBoot) {
    await opts.onBoot()
  }

  opts.jobLoop?.start()
  opts.startHeartbeat?.()

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return
    shuttingDown = true
    drain.setDraining(true)
    opts.logger.info({ signal }, 'Kapanis basladi')

    opts.jobLoop?.stop()
    opts.stopHeartbeat?.()

    if (opts.jobLoop) {
      await opts.jobLoop.drain(opts.shutdownDrainMs)
      await opts.jobLoop.requeueOwn().catch((error) => {
        opts.logger.warn({ err: error }, 'Isler kuyruga geri konamadi')
      })
    }

    try {
      await app.close()
    } catch (error) {
      opts.logger.warn({ err: error }, 'HTTP kapanisi hatasi')
    }

    await opts.onAfterClose?.().catch(() => undefined)
    await opts.flushMonitoring()

    opts.logger.info('Kapanis tamam')
    process.exit(signal === 'uncaughtException' ? 1 : 0)
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('unhandledRejection', (reason) => {
    opts.captureException(reason)
    opts.logger.error({ err: reason }, 'Yakalanmamis promise reddi')
  })
  process.on('uncaughtException', (error) => {
    opts.captureException(error)
    opts.logger.fatal({ err: error }, 'Yakalanmamis istisna, kapaniliyor')
    void shutdown('uncaughtException')
  })
}
