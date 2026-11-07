import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {createHash} from 'node:crypto'
import {verifyPersistedImageBytes,persistGeneratedImage} from './image-storage-contract'
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

test('INSERT-only storage delivers once and reconciles a concurrent duplicate without UPDATE',async()=>{
  const bytes=await sharp({create:{width:16,height:12,channels:3,background:'#168347'}}).png().toBuffer()
  let stored:Buffer|null=null
  const bucket={
    async upload(_path:string,data:Buffer,options:{upsert:boolean}){
      if(options.upsert)return {error:{statusCode:'403',message:'UPDATE permission denied'}}
      if(stored)return {error:{statusCode:'400',error:'Duplicate',message:'The resource already exists'}}
      stored=data;return {error:null}
    },
    async download(){return {data:new Blob([stored!]),error:null}},
  }
  const first=await persistGeneratedImage(bucket,'owned/job.png',bytes,'image/png')
  const duplicate=await persistGeneratedImage(bucket,'owned/job.png',bytes,'image/png')
  assert.equal(first.sha256,duplicate.sha256)
  const different=await sharp({create:{width:16,height:12,channels:3,background:'#ffffff'}}).png().toBuffer()
  await assert.rejects(persistGeneratedImage(bucket,'owned/job.png',different,'image/png'),/IMAGE_STORAGE_BYTES_MISMATCH/)
})

test('permission denial is never mistaken for a reconciled duplicate',async()=>{
  const denied={statusCode:'403',message:'permission denied'}
  let reads=0
  const bucket={async upload(){return {error:denied}},async download(){reads++;return {data:null}}}
  await assert.rejects(persistGeneratedImage(bucket,'foreign/job.png',Buffer.from('x'),'image/png'),error=>error===denied)
  assert.equal(reads,0)
})
