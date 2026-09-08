import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const services = [
  'rcs-service',
  'line-service',
  'wechat-service',
  'webchat-service',
  'ikas-service',
  'woo-service',
  'magento-service',
  'tsoft-service',
  'ticimax-service',
  'ideasoft-service',
  'proje-service',
  'trendyol-service',
  'hepsiburada-service',
  'erp-service',
  'crm-service',
]

const footer = `  })
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  const app = createApp()
  await app.listen(env.port)
  logger.info({ port: env.port, channel: CHANNEL, mockMode: env.mockMode }, 'listening')
}

export { env }
`

for (const svc of services) {
  const file = path.join(root, 'apps', svc, 'src', 'index.ts')
  let content = fs.readFileSync(file, 'utf8')
  if (content.includes('export function createApp')) {
    console.log('skip', svc)
    continue
  }

  if (!content.includes("import path from 'node:path'")) {
    content = content.replace(
      "import process from 'node:process'",
      "import process from 'node:process'\nimport path from 'node:path'\nimport { fileURLToPath } from 'node:url'",
    )
  }

  content = content.replace(/^function getHealth/m, 'export function getHealth')
  content = content.replace('const app = createHttpServer({', 'export function createApp() {\n  return createHttpServer({')

  content = content.replace(
    /\}\)\n\nif \(process\.env\.NODE_ENV !== 'test'\) \{\n  await app\.listen\(env\.port\)\n  logger\.info\(\{ port: env\.port, channel: CHANNEL, mockMode: env\.mockMode \}, 'listening'\)\n\}\n\nexport \{ app, getHealth, env \}/,
    footer,
  )

  fs.writeFileSync(file, content)
  console.log('updated', svc)
}
