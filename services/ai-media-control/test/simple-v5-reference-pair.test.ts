import test from 'node:test'
import assert from 'node:assert/strict'
import { assertSimpleV5ReferencePair } from '../src/simple-v5-reference-pair.js'
const hero = { asset_id:'hero',org_id:'owned',role:'product',sha256:'a'.repeat(64),file_path:'/shared/hero.jpg' }
const logo = { asset_id:'logo',org_id:'owned',role:'logo',sha256:'b'.repeat(64),file_path:'/shared/logo.png' }
test('one product and one logo remain attached to Flow in either upload order', () => {
  assert.doesNotThrow(()=>assertSimpleV5ReferencePair('owned',[hero,logo]))
  assert.doesNotThrow(()=>assertSimpleV5ReferencePair('owned',[logo,hero]))
  for (const refs of [[hero],[logo],[hero,hero],[hero,logo,logo],[hero,{...logo,org_id:'foreign'}],[hero,{...logo,sha256:hero.sha256}],[hero,{...logo,asset_id:hero.asset_id}],[hero,{...logo,role:'environment'}]]) {
    assert.throws(()=>assertSimpleV5ReferencePair('owned',refs),/CANONICAL_REFERENCE_PAIR_REQUIRED/)
  }
})
