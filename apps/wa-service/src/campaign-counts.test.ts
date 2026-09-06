import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import {
  CAMPAIGN_SENT_SQL_IN,
  CAMPAIGN_SENT_STATUSES,
  countCampaignStatusBuckets,
} from './campaign-counts.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const campaignCountsSrc = readFileSync(join(root, 'src', 'campaign-counts.ts'), 'utf8')

test('countCampaignStatusBuckets: sent includes delivered and read', () => {
  assert.deepEqual(
    countCampaignStatusBuckets(['sent', 'delivered', 'read', 'queued', 'sending']),
    { sent: 3, failed: 0, skipped: 0 },
  )
})

test('countCampaignStatusBuckets: failed and skipped are separate', () => {
  assert.deepEqual(
    countCampaignStatusBuckets(['failed', 'skipped', 'failed', 'sent']),
    { sent: 1, failed: 2, skipped: 1 },
  )
})

test('countCampaignStatusBuckets: empty and unknown statuses', () => {
  assert.deepEqual(countCampaignStatusBuckets([]), { sent: 0, failed: 0, skipped: 0 })
  assert.deepEqual(countCampaignStatusBuckets(['queued', 'sending', 'pending']), {
    sent: 0,
    failed: 0,
    skipped: 0,
  })
})

test('CAMPAIGN_SENT_STATUSES matches reconcile SQL filter', () => {
  assert.deepEqual([...CAMPAIGN_SENT_STATUSES], ['sent', 'delivered', 'read'])
  assert.equal(CAMPAIGN_SENT_SQL_IN, `status in ('sent', 'delivered', 'read')`)
  assert.match(campaignCountsSrc, /\$\{CAMPAIGN_SENT_SQL_IN\}/)
  assert.match(campaignCountsSrc, /count\(\*\) filter \(where status = 'failed'\)/)
  assert.match(campaignCountsSrc, /count\(\*\) filter \(where status = 'skipped'\)/)
})
