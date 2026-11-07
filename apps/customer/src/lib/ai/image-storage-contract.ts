import {createHash} from 'node:crypto'
import {inspectImageOutput,ImageOutputInvalidError} from './image-output'
/** Immutable job paths require INSERT/SELECT, never an extra UPDATE permission. */
export async function persistGeneratedImage(bucket: any, path: string, bytes: Buffer, mimeType: string) {
  const uploaded = await bucket.upload(path, bytes, {contentType:mimeType,upsert:false})
  const error = uploaded.error
  const status = String(error?.statusCode ?? error?.status ?? '')
  const duplicate = status === '409' || (status === '400' &&
    (error?.error === 'Duplicate' || /^(?:The resource|Asset) already exists\.?$/i.test(error?.message || '')))
  if (error && !duplicate) throw error
  const readback = await bucket.download(path)
  if (readback.error || !readback.data || readback.data.size > 32 * 1024 * 1024) {
    throw new Error('IMAGE_STORAGE_READBACK_REQUIRED')
  }
  return verifyPersistedImageBytes(bytes,Buffer.from(await readback.data.arrayBuffer()))
}
export async function verifyPersistedImageBytes(expected: Buffer, persisted: Buffer) {
  if (persisted.length !== expected.length || createHash('sha256').update(persisted).digest('hex') !== createHash('sha256').update(expected).digest('hex')) {
    throw new ImageOutputInvalidError('IMAGE_STORAGE_BYTES_MISMATCH')
  }
  const measured = await inspectImageOutput(persisted)
  return {...measured, sha256:createHash('sha256').update(persisted).digest('hex'), size:persisted.length}
}
