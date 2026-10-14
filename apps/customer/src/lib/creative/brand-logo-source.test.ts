import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveOwnedLogoPath } from './brand-logo-source'

test('a variation resolves the current asset of the exact owned kit instead of a stale parent URL',async()=>{
  const calls:string[]=[]
  const actual=await resolveOwnedLogoPath({tenantId:'tenant-a',kitId:'parent-kit'}, {
    kit:async(org,id)=>{calls.push(`${org}:${id}`);return {logo_path:'tenant-a/original-logo.png'}},
    organization:async()=>{throw new Error('must not replace a selected kit')},
  })
  assert.equal(actual,'tenant-a/original-logo.png')
  assert.deepEqual(calls,['tenant-a:parent-kit'])
})
test('a missing/foreign kit or lookup failure cannot silently become a different logo',async()=>{
  let fallbacks=0
  const lookup={kit:async()=>null,organization:async()=>{fallbacks++;return {logo_path:'other-logo.png'}}}
  await assert.rejects(resolveOwnedLogoPath({tenantId:'tenant-a',kitId:'foreign-kit'},lookup),/BRAND_KIT_NOT_OWNED/)
  assert.equal(fallbacks,0)
  await assert.rejects(resolveOwnedLogoPath({tenantId:'tenant-a',kitId:'kit'},{...lookup,kit:async()=>{throw new Error('unavailable')}}),/unavailable/)
  assert.equal(fallbacks,0)
})
test('custom logo remains exact; organization fallback is tenant scoped and absence stays missing',async()=>{
  const lookup={kit:async()=>{throw new Error('unexpected kit')},organization:async(org:string)=>{
    assert.equal(org,'tenant-a');return {logo_path:'tenant-a/logo.png'}
  }}
  assert.equal(await resolveOwnedLogoPath({tenantId:'tenant-a',customLogoUrl:'explicit-logo'},lookup),'explicit-logo')
  assert.equal(await resolveOwnedLogoPath({tenantId:'tenant-a'},lookup),'tenant-a/logo.png')
  assert.equal(await resolveOwnedLogoPath({tenantId:'tenant-a'},{...lookup,organization:async()=>null}),null)
})
