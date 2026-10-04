import { readFileSync } from 'node:fs'
/** Only spread this into requests to the configured internal supervisor. */
export function supervisorAuth(env = process.env, readTokenFile = (file: string) => readFileSync(file, 'utf8')): {headers: Record<string,string>,redirect:'error'} {
  let token = env.WORKER_CONTROL_TOKEN || ''
  if (!token) {
    try { token = readTokenFile(env.WORKER_CONTROL_TOKEN_FILE || '/run/secrets/worker_control_token').trim() }
    catch { /* Fail closed below; never expose file contents or filesystem errors. */ }
  }
  if (!token && env.NODE_ENV === 'production') throw new Error('WORKER_CONTROL_TOKEN_REQUIRED')
  return {headers:{'Content-Type':'application/json',...(token ? {'x-worker-token':token} : {})},redirect:'error'}
}
