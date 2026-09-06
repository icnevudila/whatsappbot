import pino from 'pino'
import { env, isProduction } from './env.js'

export const logger = pino({
  level: env.logLevel,
  base: { worker: env.workerId },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
})

export type Logger = typeof logger
