import { createHash } from 'node:crypto'
import { normalizeForLibrary } from './ai-suggestions'

// Server cache identity; keep Node crypto outside the client suggestion module.
export function fingerprint(input: string): string {
  return createHash('sha256').update(normalizeForLibrary(input)).digest('hex')
}
