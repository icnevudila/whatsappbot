import { logger } from './logger.js'

let cachedWorkingBaseUrl: string | null = null

function getCandidateBaseUrls(): string[] {
  const envUrl = process.env.OMNISTUDIO_GATEWAY_URL?.replace(/\/$/, '')
  const candidates: string[] = []

  if (cachedWorkingBaseUrl) {
    candidates.push(cachedWorkingBaseUrl)
  }

  if (envUrl && !envUrl.includes('127.0.0.1') && !envUrl.includes('localhost')) {
    candidates.push(envUrl)
  }

  candidates.push(
    'http://host.docker.internal:3456',
    'http://172.18.0.1:3456',
    'http://172.17.0.1:3456',
    'http://omnistudio-engine:3456',
    'http://127.0.0.1:3456',
  )

  return [...new Set(candidates)]
}

export async function fetchFromOmniStudio(
  endpointPath: string,
  init: RequestInit,
): Promise<Response> {
  const cleanPath = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`
  const candidates = getCandidateBaseUrls()
  let lastError: unknown = null

  for (const baseUrl of candidates) {
    try {
      const url = `${baseUrl}${cleanPath}`
      const response = await fetch(url, init)
      cachedWorkingBaseUrl = baseUrl
      return response
    } catch (err) {
      lastError = err
      if (cachedWorkingBaseUrl === baseUrl) {
        cachedWorkingBaseUrl = null
      }
      logger.debug(
        { baseUrl, endpointPath, err: err instanceof Error ? err.message : err },
        'omnistudio-client: candidate baglantisi basarisiz, sonraki deneniyor',
      )
    }
  }

  throw lastError || new Error('OmniStudio gateway ulasilamadi')
}
