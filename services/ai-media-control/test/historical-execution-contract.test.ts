import test from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { runHistoricalVideoDirector } from '../src/historical-video-director.js'
import { createHistoricalExecutionContract } from '../src/historical-execution-contract.js'

test('historical video director generates execution contract with fallback', async () => {
  // 1x1 PNG fixture bytes
  const pngBytes = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex')
  // Minimal JPEG fixture bytes
  const jpgBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9])

  const heroSha = createHash('sha256').update(jpgBytes).digest('hex')
  const logoSha = createHash('sha256').update(pngBytes).digest('hex')

  const heroPath = join(tmpdir(), `hero-${Date.now()}.jpg`)
  const logoPath = join(tmpdir(), `logo-${Date.now()}.png`)
  writeFileSync(heroPath, jpgBytes)
  writeFileSync(logoPath, pngBytes)

  try {
    const rawInput: any = {
      org_id: 'org-test',
      brand_name: 'Bofe',
      brand_description: 'Bahçe ve tarım ekipmanları üreticisi',
      sector_profile: 'agriculture_machinery',
      logo_asset_id: 'logo-1',
      logo_sha256: logoSha,
      products: [{
        product_id: 'prod-1',
        name: 'Bofe 16L İlaçlama Pompası',
        description: '16 litrelik akülü sırt tipi ilaçlama pompası',
        asset_id: 'hero-1',
        sha256: heroSha,
      }],
      campaign: {
        objective: 'Bofe İlaçlama Pompası tanıtımı',
        cta: 'Hemen İnceleyin',
        approved_spoken_line: 'Bofe İlaçlama Pompası tarlada yüksek performans ve güven sunuyor.',
      }
    }

    const assets: any = [
      { asset_id: 'hero-1', org_id: 'org-test', role: 'product', sha256: heroSha, file_path: heroPath },
      { asset_id: 'logo-1', org_id: 'org-test', role: 'logo', sha256: logoSha, file_path: logoPath },
    ]

    // Gateway is unreachable in unit test, should cleanly fall back to deterministic historical prompt
    const directed = await runHistoricalVideoDirector({
      rawInput,
      assets,
      jobId: 'job-unit-1',
      attemptId: 'att-unit-1',
      gatewayUrl: 'http://127.0.0.1:9999', // non-existent port
    })

    assert.equal(directed.fallbackUsed, true)
    assert.ok(directed.providerPrompt.length > 200)
    assert.ok(directed.providerPrompt.includes('Bofe'))
    assert.ok(directed.providerPrompt.includes('Native Turkish commercial narration EXACTLY ONCE: "Bofe İlaçlama Pompası tarlada yüksek performans ve güven sunuyor."'))
    assert.ok(directed.providerPrompt.includes('Voiceover starts at 0.5s, targets completion at 5.25s, and the last word finishes strictly before 5.5s.'))

    const contract = createHistoricalExecutionContract(rawInput, directed)
    assert.equal(contract.brief.durationSeconds, 8)
    assert.equal(contract.brief.aspectRatio, '9:16')
    assert.equal(contract.productionPlan.timeline.footage_start_sec, 0)
    assert.equal(contract.productionPlan.timeline.footage_end_sec, 8)
    assert.equal(contract.productionPlan.shots.length, 3)
    assert.equal(contract.diagnostics.creative_behavior, 'HISTORICAL_20260921')
    assert.equal(contract.diagnostics.source_tree_sha, '6f4541db624f82a13c964c77dd421b15046465a1')
  } finally {
    try { unlinkSync(heroPath) } catch {}
    try { unlinkSync(logoPath) } catch {}
  }
})
