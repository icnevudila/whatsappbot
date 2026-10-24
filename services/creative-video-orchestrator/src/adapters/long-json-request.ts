import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

/** A paid generation may legitimately outlive fetch's five-minute headers limit.
 * Keep one request, an absolute caller deadline and a bounded response body. */
export function postGenerationJson(url: string, payload: unknown, signal: AbortSignal): Promise<Response> {
  return new Promise((resolve, reject) => {
    const target = new URL(url)
    if (!['http:', 'https:'].includes(target.protocol)) return reject(new Error('INVALID_ENGINE_URL'))
    const body = JSON.stringify(payload)
    const request = (target.protocol === 'https:' ? httpsRequest : httpRequest)(target, {
      method: 'POST', signal,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, response => {
      const chunks: Buffer[] = []
      let bytes = 0
      response.on('data', chunk => {
        bytes += chunk.length
        if (bytes > 4 * 1024 * 1024) { response.destroy(new Error('ENGINE_RESPONSE_TOO_LARGE')); return }
        chunks.push(Buffer.from(chunk))
      })
      response.on('error', reject)
      response.on('aborted', () => reject(new Error('ENGINE_RESPONSE_ABORTED')))
      response.on('end', () => resolve(new Response(Buffer.concat(chunks), {
        status: response.statusCode || 502,
        headers: { 'Content-Type': String(response.headers['content-type'] || 'application/json') },
      })))
    })
    request.on('error', reject)
    request.end(body)
  })
}
