import test from 'node:test'
import assert from 'node:assert/strict'
import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

for(const direct of [false,true]) test(`database capability matches ${direct?'direct SQL':'HTTP-only'} backend`,()=>{
  const moduleUrl=new URL('../src/db.ts',import.meta.url).href
  const result=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',
    `const {db}=await import(${JSON.stringify(moduleUrl)}); console.log('QUERY_TYPE:'+typeof db.query); process.exit(0)`],{
    cwd:fileURLToPath(new URL('../../../',import.meta.url)),encoding:'utf8',
    env:{...process.env,DATABASE_URL:direct?'postgresql://127.0.0.1:1/fixture':'',SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'fixture'}
  })
  assert.equal(result.status,0,result.stderr)
  assert.ok(result.stdout.includes('QUERY_TYPE:'+(direct?'function':'undefined')),result.stdout)
})
