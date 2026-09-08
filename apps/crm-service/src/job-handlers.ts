import {
  NonRetryableJobError,
  type ChannelJobRow,
  type DbHelpers,
} from '@wa/channel-worker-kit'
import { answerQna, lookupOrder, lookupStock } from './adapter.js'
import { loadChannelAccount, tokenFromCredentials } from './accounts.js'
import { env, loadCrmConfig } from './env.js'

export async function handleChannelJob(
  job: ChannelJobRow,
  _db: DbHelpers | null,
): Promise<unknown> {
  switch (job.type) {
    case 'channel.lookup':
      return handleLookup(job)
    case 'channel.qna.answer':
      return handleQnaAnswer(job)
    default:
      throw new NonRetryableJobError(`Bilinmeyen is tipi: ${job.type}`)
  }
}

async function handleLookup(job: ChannelJobRow): Promise<unknown> {
  const payload = job.payload
  const orderId =
    (typeof payload.orderId === 'string' && payload.orderId) ||
    (typeof payload.order_id === 'string' && payload.order_id) ||
    ''
  const sku =
    (typeof payload.sku === 'string' && payload.sku) ||
    (typeof payload.SKU === 'string' && payload.SKU) ||
    ''

  if (!orderId && !sku) {
    throw new NonRetryableJobError('channel.lookup: orderId veya sku zorunlu')
  }

  const accountId = job.channel_account_id ?? String(payload.accountId ?? env.accountId)
  const account = await loadChannelAccount(accountId)
  const credToken = account ? tokenFromCredentials(account.credentials) : ''
  const token =
    (typeof payload.token === 'string' && payload.token) ||
    credToken ||
    env.token

  const orgId = job.org_id ?? account?.org_id ?? env.orgId
  const config = loadCrmConfig({
    token,
    mockMode: env.mockMode && !token,
    liveEnabled: Boolean(token) && (env.liveEnabled || !env.mockMode),
    orgId,
    accountId,
  })

  if (orderId) {
    const result = await lookupOrder(orderId, config)
    if (!result.ok) throw new Error(result.error || 'lookup_order_failed')
    return result
  }

  const result = await lookupStock(sku, config)
  if (!result.ok) throw new Error(result.error || 'lookup_stock_failed')
  return result
}

async function handleQnaAnswer(job: ChannelJobRow): Promise<unknown> {
  const payload = job.payload
  const question =
    (typeof payload.question === 'string' && payload.question) ||
    (typeof payload.text === 'string' && payload.text) ||
    ''
  if (!question) {
    throw new NonRetryableJobError('channel.qna.answer: question zorunlu')
  }

  const accountId = job.channel_account_id ?? String(payload.accountId ?? env.accountId)
  const account = await loadChannelAccount(accountId)
  const credToken = account ? tokenFromCredentials(account.credentials) : ''
  const token =
    (typeof payload.token === 'string' && payload.token) ||
    credToken ||
    env.token

  const result = await answerQna(question, loadCrmConfig({
    token,
    mockMode: env.mockMode && !token,
    liveEnabled: Boolean(token) && (env.liveEnabled || !env.mockMode),
    orgId: job.org_id ?? account?.org_id ?? env.orgId,
    accountId,
  }))

  if (!result.ok) {
    throw new Error(result.error || 'qna_answer_failed')
  }
  return result
}

export async function enqueueChannelJob(
  db: DbHelpers,
  input: {
    orgId: string | null
    channelAccountId: string | null
    channel: string
    type: string
    payload: Record<string, unknown>
  },
): Promise<string> {
  const rows = await db.query<{ id: string }>(
    `insert into public.channel_jobs
       (org_id, channel_account_id, channel, type, payload)
     values ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
     returning id::text`,
    [
      input.orgId,
      input.channelAccountId,
      input.channel,
      input.type,
      JSON.stringify(input.payload),
    ],
  )
  const id = rows[0]?.id
  if (!id) throw new Error('enqueue failed')
  return id
}
