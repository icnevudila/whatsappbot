import { constants, copyFileSync, existsSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join } from 'node:path'

export function publishImmutableVideoFile(source: string, directory: string, jobId: string, attemptId: string, kind: 'raw' | 'finished'): string {
  if (![jobId, attemptId].every(id => /^[A-Za-z0-9_-]{1,128}$/.test(id))) throw new Error('INVALID_VIDEO_PUBLICATION_IDENTITY')
  const target = join(directory, `${jobId}_${attemptId}_${kind}.mp4`)
  const sourceSha = createHash('sha256').update(readFileSync(source)).digest('hex')
  try {
    copyFileSync(source, target, constants.COPYFILE_EXCL)
  } catch (error) {
    if (!existsSync(target) || createHash('sha256').update(readFileSync(target)).digest('hex') !== sourceSha) throw error
  }
  if (createHash('sha256').update(readFileSync(target)).digest('hex') !== sourceSha) throw new Error('VIDEO_PUBLICATION_SHA_MISMATCH')
  return target
}
