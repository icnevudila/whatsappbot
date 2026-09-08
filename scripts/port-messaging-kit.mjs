import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const lineSrc = path.join(root, 'apps/line-service/src')

const services = [
  {
    name: 'webchat',
    pkg: 'webchat-service',
    Channel: 'Webchat',
    CHANNEL: 'webchat',
    loadConfig: 'loadWebchatConfig',
    mockId: 'webchat-mock-1',
    port: 3005,
    mockMsgPrefix: 'mock-webchat-',
    sampleInbound: { text: 'selam', threadId: 'sess-1', senderId: 'u1' },
    threadAssert: 'sess-1',
  },
  {
    name: 'rcs',
    pkg: 'rcs-service',
    Channel: 'Rcs',
    CHANNEL: 'rcs',
    loadConfig: 'loadRcsConfig',
    mockId: 'rcs-mock-1',
    port: 3004,
    mockMsgPrefix: 'mock-rcs-',
    sampleInbound: { text: 'selam', senderPhoneNumber: '+905551112233', messageId: 'm1' },
    threadAssert: '+905551112233',
  },
  {
    name: 'wechat',
    pkg: 'wechat-service',
    Channel: 'Wechat',
    CHANNEL: 'wechat',
    loadConfig: 'loadWechatConfig',
    mockId: 'wechat-mock-1',
    port: 3006,
    mockMsgPrefix: 'mock-wechat-',
    sampleInbound: { MsgType: 'text', FromUserName: 'wx-user-1', Content: 'selam', MsgId: '9' },
    threadAssert: 'wx-user-1',
  },
]

function rewrite(content, s) {
  return content
    .replaceAll('line-service', `${s.name}-service`)
    .replaceAll('LineHealth', `${s.Channel}Health`)
    .replaceAll('loadLineConfig', s.loadConfig)
    .replaceAll('LineConfig', `${s.Channel}Config`)
    .replaceAll('line_send_failed', `${s.CHANNEL}_send_failed`)
    .replaceAll("'line'", `'${s.CHANNEL}'`)
    .replaceAll('"line"', `"${s.CHANNEL}"`)
    .replaceAll('line-mock-1', s.mockId)
    .replaceAll('mock-line-', s.mockMsgPrefix)
    .replaceAll('mock-line', `mock-${s.CHANNEL}`)
    .replaceAll("port: intEnv('PORT', 3003)", `port: intEnv('PORT', ${s.port})`)
}

for (const s of services) {
  const dest = path.join(root, `apps/${s.pkg}/src`)
  for (const f of ['env.ts', 'db.ts', 'accounts.ts', 'job-handlers.ts', 'jobs.test.ts', 'index.ts']) {
    let out = rewrite(fs.readFileSync(path.join(lineSrc, f), 'utf8'), s)
    if (f === 'jobs.test.ts') {
      out = out.replace(
        /payload: \{\s*raw: \{[\s\S]*?\},\s*\},/,
        `payload: {\n      raw: ${JSON.stringify(s.sampleInbound)},\n    },`,
      )
      out = out.replace(
        "assert.equal(r.event.externalThreadId, '55')",
        `assert.equal(r.event.externalThreadId, '${s.threadAssert}')`,
      )
    }
    fs.writeFileSync(path.join(dest, f), out)
    console.log('wrote', s.pkg, f)
  }

  const pkgPath = path.join(root, `apps/${s.pkg}/package.json`)
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
  pkg.dependencies = {
    ...pkg.dependencies,
    '@sentry/node': '^10.73.0',
    '@wa/channel-worker-kit': '*',
    pg: '8.23.0',
  }
  pkg.devDependencies = {
    ...pkg.devDependencies,
    '@types/pg': '8.23.1',
  }
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  console.log('updated package', s.pkg)
}

console.log('done')
