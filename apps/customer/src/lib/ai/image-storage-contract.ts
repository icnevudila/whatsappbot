import {createHash} from 'node:crypto'
import {inspectImageOutput,ImageOutputInvalidError} from './image-output'
export async function verifyPersistedImageBytes(expected: Buffer, persisted: Buffer) {
  if (persisted.length !== expected.length || createHash('sha256').update(persisted).digest('hex') !== createHash('sha256').update(expected).digest('hex')) {
    throw new ImageOutputInvalidError('IMAGE_STORAGE_BYTES_MISMATCH')
  }
  const measured = await inspectImageOutput(persisted)
  return {...measured, sha256:createHash('sha256').update(persisted).digest('hex'), size:persisted.length}
}
