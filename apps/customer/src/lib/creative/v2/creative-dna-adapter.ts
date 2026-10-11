/**
 * Creative DNA Integration Adapter (Extension Point)
 *
 * Designed to cleanly bridge the upcoming Video Engine Bot outputs
 * (from branch `feature/creative-dna-research-validation`) into the Wizard V3
 * and Creative Studio pipelines without creating runtime coupling or breaking
 * existing production behavior.
 *
 * Default State: FEATURE FLAG DISABLED (`process.env.ENABLE_CREATIVE_DNA === 'true'`)
 */

export interface CreativeDNASpec {
  brandName: string
  canonicalLogoUrl: string
  productName: string
  productImageUrl: string
  aspectRatio: '9:16' | '1:1' | '4:5'
  spokenLine: string
  soundtrackStyle?: string
  brandOutroEnabled: boolean
  promptBlueprint?: string
}

export interface CreativeDNAAdapterResult {
  active: boolean
  adapterMode: 'PASS_THROUGH' | 'DNA_TRANSFORMED'
  payload: Record<string, unknown>
  metadata?: {
    botBranchRef: 'feature/creative-dna-research-validation'
    appliedAt: string
  }
}

/**
 * Returns whether the experimental Creative DNA pipeline is active.
 */
export function isCreativeDNAEnabled(): boolean {
  return process.env.ENABLE_CREATIVE_DNA === 'true' || process.env.NEXT_PUBLIC_ENABLE_CREATIVE_DNA === 'true'
}

/**
 * Transforms standard creative studio inputs according to Creative DNA blueprints
 * when feature flag is explicitly enabled. Defaults to a strict pass-through.
 */
export function adaptCreativeWithDNA(
  inputPayload: Record<string, unknown>,
  options?: { enabledOverride?: boolean }
): CreativeDNAAdapterResult {
  const isEnabled = options?.enabledOverride ?? isCreativeDNAEnabled()

  if (!isEnabled) {
    return {
      active: false,
      adapterMode: 'PASS_THROUGH',
      payload: inputPayload,
    }
  }

  // When flag is enabled in future releases, enrich the authoritative facts
  const enrichedFacts = {
    ...((inputPayload.authoritativeFacts as Record<string, unknown>) || {}),
    creative_dna_version: 'v1.0-empirical',
    creative_dna_bridge_ready: true,
  }

  return {
    active: true,
    adapterMode: 'DNA_TRANSFORMED',
    payload: {
      ...inputPayload,
      authoritativeFacts: enrichedFacts,
    },
    metadata: {
      botBranchRef: 'feature/creative-dna-research-validation',
      appliedAt: new Date().toISOString(),
    },
  }
}
