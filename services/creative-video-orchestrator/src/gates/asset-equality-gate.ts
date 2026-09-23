import type { MultimodalAttachment } from '../types/creative-context.js'

export interface FlowAssetAttachmentProof {
  asset_id: string
  role: string
  sha256: string
  flow_media_id?: string
}

export interface AssetEqualityCheckResult {
  passed: boolean
  error?: string
  checked_count: number
  matched_count: number
  mismatches: Array<{
    asset_id: string
    role: string
    creative_sha256: string
    flow_sha256: string
  }>
}

export class AssetEqualityGate {
  /**
   * Verifies that the exact assets analyzed by the Creative Director (and locked in revision)
   * match the assets attached in Flow/Veo generation byte-for-byte.
   */
  public static verifyEquality(
    creativeAssets: MultimodalAttachment[],
    flowAssets: FlowAssetAttachmentProof[]
  ): AssetEqualityCheckResult {
    const flowMap = new Map<string, FlowAssetAttachmentProof>()
    for (const f of flowAssets) {
      // index by role and asset_id
      if (f.asset_id) flowMap.set(`id:${f.asset_id}`, f)
      if (f.role) flowMap.set(`role:${f.role.toLowerCase()}`, f)
    }

    const mismatches: Array<{
      asset_id: string
      role: string
      creative_sha256: string
      flow_sha256: string
    }> = []

    let matched = 0

    for (const c of creativeAssets) {
      const targetRole = c.role.toLowerCase()
      const match = flowMap.get(`id:${c.asset_id}`) || flowMap.get(`role:${targetRole}`)

      if (!match) {
        mismatches.push({
          asset_id: c.asset_id,
          role: c.role,
          creative_sha256: c.sha256,
          flow_sha256: 'MISSING_IN_FLOW',
        })
        continue
      }

      const cSha = String(c.sha256 || '').toLowerCase()
      const fSha = String(match.sha256 || '').toLowerCase()

      if (cSha !== fSha) {
        mismatches.push({
          asset_id: c.asset_id,
          role: c.role,
          creative_sha256: cSha,
          flow_sha256: fSha,
        })
      } else {
        matched++
      }
    }

    if (mismatches.length > 0) {
      const details = mismatches
        .map(m => `[Role: ${m.role}, Creative SHA: ${m.creative_sha256.slice(0, 10)} vs Flow SHA: ${m.flow_sha256.slice(0, 10)}]`)
        .join('; ')
      return {
        passed: false,
        error: `CREATIVE_ASSET_DRIFT: Asset SHA drift detected between Creative Director and Flow execution: ${details}`,
        checked_count: creativeAssets.length,
        matched_count: matched,
        mismatches,
      }
    }

    return {
      passed: true,
      checked_count: creativeAssets.length,
      matched_count: matched,
      mismatches: [],
    }
  }
}
