import test from 'node:test'
import assert from 'node:assert/strict'
import { loadVideoLibraryState, videoDurationLabel } from './video-library-state'
import { detailRenderState } from './detail-render-state'

test('library replaces stale ready with owned output approval and actual duration', async () => {
  const outputId = 'a55d1687-1924-42dd-a721-000ba5efbaad'
  const rows = [{ id: 'creative', status: 'ready', public_url: `/api/ai-media/outputs/${outputId}` }]
  const filters: any[] = []
  let output: any = { id: outputId, org_id: 'owned', verified: true, is_approved: false, duration_seconds: '8.00' }
  let error: any = null
  const query: any = { select() { return this }, eq(...args: any[]) { filters.push(args); return this },
    async in() { return { data: [output], error } } }
  const db = { from() { return query } }
  assert.deepEqual((await loadVideoLibraryState(db, 'owned', rows)).get('creative'), { status: 'needs_review', durationSeconds: 8 })
  assert.ok(filters.some(item => item[0] === 'org_id' && item[1] === 'owned'))
  output.is_approved = true
  assert.equal((await loadVideoLibraryState(db, 'owned', rows)).get('creative')?.status, 'ready')
  output.org_id = 'foreign'
  assert.deepEqual((await loadVideoLibraryState(db, 'owned', rows)).get('creative'), { status: 'needs_review', durationSeconds: null })
  error = { message: 'unavailable' }
  assert.equal((await loadVideoLibraryState(db, 'owned', rows)).get('creative')?.status, 'needs_review')
  assert.equal(videoDurationLabel(8), '0:08')
  assert.equal(videoDurationLabel(65), '1:05')
  assert.equal(videoDurationLabel(null), 'Video')
  assert.equal(detailRenderState({ status: 'needs_review', publicUrl: 'old.mp4', livePublicUrl: 'old.mp4', busyRender: true }).ready, false)
  assert.equal(detailRenderState({ status: 'needs_review', livePublicUrl: 'old.mp4', busyRender: true }).spinning, false)
})
