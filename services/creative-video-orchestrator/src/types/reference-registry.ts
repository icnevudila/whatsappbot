import type { AssetVisionBrief } from './asset-vision-brief.js'
import type { ReferenceRole } from './brand-snapshot.js'

export type CanonicalHandle =
  | '@BrandLogo'
  | '@HeroProduct'
  | '@SecondaryProduct'
  | '@Presenter'
  | '@Environment'
  | '@Packaging'
  | '@StyleReference'
  | `@CustomRef_${string}`

export interface ReferenceUsageRules {
  prohibitedMutations: string[]
  prominence: 'hero' | 'foreground' | 'background' | 'overlay'
  fidelityRequired: boolean
}

export interface ReferenceHandleRecord {
  handle: CanonicalHandle
  asset_id: string
  org_id: string
  sha256: string
  role: ReferenceRole
  aiBrief?: AssetVisionBrief
  usage_rules: ReferenceUsageRules
  file_path?: string
  url?: string
}

export class ReferenceRegistry {
  private handles = new Map<CanonicalHandle, ReferenceHandleRecord>()
  private assetIdToHandle = new Map<string, CanonicalHandle>()

  constructor(public readonly org_id: string) {}

  register(record: ReferenceHandleRecord): void {
    if (record.org_id !== this.org_id) {
      throw new Error(`SECURITY_VIOLATION: Asset org_id ${record.org_id} does not match registry org_id ${this.org_id}`)
    }
    if (!record.sha256 || record.sha256.length < 32) {
      throw new Error(`SECURITY_VIOLATION: Invalid SHA-256 for reference ${record.handle}`)
    }

    this.handles.set(record.handle, record)
    this.assetIdToHandle.set(record.asset_id, record.handle)
  }

  get(handle: CanonicalHandle): ReferenceHandleRecord | undefined {
    return this.handles.get(handle)
  }

  getByAssetId(assetId: string): ReferenceHandleRecord | undefined {
    const handle = this.assetIdToHandle.get(assetId)
    return handle ? this.handles.get(handle) : undefined
  }

  has(handle: CanonicalHandle): boolean {
    return this.handles.has(handle)
  }

  getAll(): ReferenceHandleRecord[] {
    return Array.from(this.handles.values())
  }

  /**
   * Resolves canonical handles inside prompt text or validates their presence.
   * Prompts MUST NEVER reference raw local file paths directly.
   */
  validatePromptHandles(promptText: string): { valid: boolean; referencedHandles: CanonicalHandle[]; missingHandles: string[] } {
    const handleRegex = /(@[A-Za-z0-9_]+)/g
    const matches = promptText.match(handleRegex) || []
    const referencedHandles: CanonicalHandle[] = []
    const missingHandles: string[] = []

    for (const match of matches) {
      const h = match as CanonicalHandle
      if (this.handles.has(h)) {
        if (!referencedHandles.includes(h)) referencedHandles.push(h)
      } else {
        missingHandles.push(match)
      }
    }

    return {
      valid: missingHandles.length === 0,
      referencedHandles,
      missingHandles,
    }
  }

  /**
   * Replaces handles with natural language descriptions grounded by aiBrief,
   * avoiding model confusion from raw symbol names while maintaining strict reference tracking.
   */
  compilePromptWithGrounding(promptText: string): string {
    let result = promptText
    for (const [handle, record] of this.handles.entries()) {
      if (result.includes(handle)) {
        let descriptiveReplacement = ''
        if (record.aiBrief && record.aiBrief.type === 'product') {
          descriptiveReplacement = `the specific product [${record.aiBrief.shape}, ${record.aiBrief.body_color}, ${record.aiBrief.material.join('/')}]`
        } else if (record.aiBrief && record.aiBrief.type === 'logo') {
          descriptiveReplacement = `official brand emblem`
        } else {
          descriptiveReplacement = `the authorized reference item`
        }
        result = result.replaceAll(handle, descriptiveReplacement)
      }
    }
    return result
  }
}
