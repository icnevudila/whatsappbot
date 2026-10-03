import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {verifyPersistedImageBytes} from './image-storage-contract'
test('storage read-back requires identical decoded pixels and actual byte hash',async()=>{
  const bytes = await sharp({create:{width:16,height:12,channels:3,background:'#168347'}}).png().toBuffer()
  const receipt = await verifyPersistedImageBytes(bytes,Buffer.from(bytes))
  assert.equal(receipt.sha256,createHash('sha256').update(bytes).digest('hex'))
  assert.equal(receipt.width,16);assert.equal(receipt.height,12)
})
test('missing, truncated or altered stored bytes cannot qualify as durable success',async()=>{
  const bytes = await sharp({create:{width:16,height:12,channels:3,background:'#168347'}}).png().toBuffer()
  const altered = Buffer.from(bytes);altered[altered.length-1] ^= 1
  for(const actual of [Buffer.alloc(0),bytes.subarray(0,40),altered])
    await assert.rejects(verifyPersistedImageBytes(bytes,actual),/IMAGE_STORAGE_BYTES_MISMATCH/)
})
