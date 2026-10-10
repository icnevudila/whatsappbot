import test from 'node:test'
import assert from 'node:assert/strict'
import { isPublicAnimationPath } from './public-animation-path'
test('decorative animation access uses a finite allowlist, not extension or directory bypass',()=>{
 assert.equal(isPublicAnimationPath('/animations/runtime/dotlottie-player.wasm'),true)
 assert.equal(isPublicAnimationPath('/animations/video/video-render.json'),true)
 for(const path of ['/animations/private.json','/animations/video/../../private.json','/animations/video/%2e%2e/private.json','/api/ai-media/outputs/x.json','/tenant-a/output.json','/animations/runtime/secrets.json']) assert.equal(isPublicAnimationPath(path),false)
})
