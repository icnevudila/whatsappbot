import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import {inspectImageOutput,ImageOutputInvalidError,assertImageAspect} from './image-output'

test('requested format rejects a decoded image of a different orientation without rejecting raster rounding',()=>{
  assert.doesNotThrow(()=>assertImageAspect(1122,1402,'4:5'))
  for(const [width,height,aspect] of [[1080,1080,'4:5'],[1920,1080,'9:16'],[1080,1920,'16:9'],[0,1080,'1:1']] as const)
    assert.throws(()=>assertImageAspect(width,height,aspect),ImageOutputInvalidError)
  for(const [width,height,aspect] of [[1080,1080,'1:1'],[1080,1350,'4:5'],[1080,1920,'9:16'],[1920,1080,'16:9']] as const)
    assert.doesNotThrow(()=>assertImageAspect(width,height,aspect))
})
test('real pixels determine dimensions and format, not requested metadata',async()=>{
  const bytes = await sharp({create:{width:48,height:36,channels:3,background:'#168347'}}).png().toBuffer()
  assert.deepEqual(await inspectImageOutput(bytes),{mimeType:'image/png',width:48,height:36})
})
test('empty, text-only and random output cannot qualify as image success',async()=>{
  for(const bytes of [Buffer.alloc(0),Buffer.from('Please upload your logo and product reference images first.'),Buffer.alloc(100,65)])
    await assert.rejects(inspectImageOutput(bytes),ImageOutputInvalidError)
})
test('metadata-readable but truncated raster is rejected on pixel decode',async()=>{
  const bytes = await sharp({create:{width:48,height:36,channels:3,background:'#168347'}}).png().toBuffer()
  await assert.rejects(inspectImageOutput(bytes.subarray(0,45)),ImageOutputInvalidError)
})
test('oversized bytes are rejected before pixel work',async()=>{
  await assert.rejects(inspectImageOutput(Buffer.alloc(32*1024*1024+1)),ImageOutputInvalidError)
})
