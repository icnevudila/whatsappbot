import test from 'node:test'
import assert from 'node:assert/strict'
import {requiresProviderAccess} from '../src/provider-access-error.js'
test('Flow public landing redirect quarantines the affected account',()=>{
  assert.equal(requiresProviderAccess('[PROJECT_CREATION_FAILED] Flow redirected to its public landing page'),true)
  assert.equal(requiresProviderAccess('FLOW_AUTH_REQUIRED'),true)
})
test('generic project/network failure does not falsely mark an account unauthenticated',()=>{
  assert.equal(requiresProviderAccess('[PROJECT_CREATION_FAILED] network timeout'),false)
  assert.equal(requiresProviderAccess('render timeout'),false)
})
