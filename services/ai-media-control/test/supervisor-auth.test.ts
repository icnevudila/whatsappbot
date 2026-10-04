import test from 'node:test'
import assert from 'node:assert/strict'
import { supervisorAuth } from '../src/providers/supervisor-auth.js'
test('supervisor token is present with redirects rejected',()=>{
  const result=supervisorAuth({NODE_ENV:'production',WORKER_CONTROL_TOKEN:'fixture-only'})
  assert.equal(result.headers['x-worker-token'],'fixture-only')
  assert.equal(result.redirect,'error')
})
test('production supervisor calls fail closed before network without token',()=>{
  const missing = () => { throw new Error('missing file') }
  assert.throws(()=>supervisorAuth({NODE_ENV:'production'}, missing),/TOKEN_REQUIRED/)
  assert.equal(supervisorAuth({NODE_ENV:'test'}, missing).headers['x-worker-token'],undefined)
})

test('read-only mounted secret works without environment token and does not permit redirects',()=>{
  let source = ''
  const result = supervisorAuth({NODE_ENV:'production'}, file => { source = file; return 'fixture-mounted-secret\n' })
  assert.equal(source, '/run/secrets/worker_control_token')
  assert.equal(result.headers['x-worker-token'], 'fixture-mounted-secret')
  assert.equal(result.redirect, 'error')
})

test('explicit environment token takes precedence over mounted secret',()=>{
  const result = supervisorAuth({NODE_ENV:'production',WORKER_CONTROL_TOKEN:'fixture-env'}, () => { throw new Error('must not read') })
  assert.equal(result.headers['x-worker-token'], 'fixture-env')
})
