import test from 'node:test'
import assert from 'node:assert/strict'
import {requiredImageAssets} from './required-image-assets'
const ready = {useLogo:true,hasLogo:true,hasProductReference:true,hasValidBase:false}
test('logo and product permit generation',()=>assert.equal(requiredImageAssets(ready).ready,true))
test('logo disabled or missing is independently rejected',()=>{
  for(const changed of [{useLogo:false},{hasLogo:false}]) assert.equal(requiredImageAssets({...ready,...changed}).code,'IMAGE_LOGO_REQUIRED')
})
test('product missing without valid base is independently rejected',()=>{
  assert.equal(requiredImageAssets({...ready,hasProductReference:false}).code,'IMAGE_PRODUCT_REFERENCE_REQUIRED')
})
test('verified derivative base satisfies reference but never bypasses logo',()=>{
  assert.equal(requiredImageAssets({...ready,hasProductReference:false,hasValidBase:true}).ready,true)
  assert.equal(requiredImageAssets({...ready,hasLogo:false,hasProductReference:false,hasValidBase:true}).ready,false)
})
