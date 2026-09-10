import pino from 'pino'

export function createWorkerLogger(name: string, workerId: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL?.trim() || 'info',
    base: { worker: workerId },
  })
}

export type WorkerLogger = ReturnType<typeof createWorkerLogger>
