/**
 * MESAJIFY CREATIVE STUDIO — CREATIVE MEMORY ENGINE
 *
 * Lightweight creative memory per organization to prevent visual repetition.
 * Tracks recent archetypes, compositions, environments, and color treatments,
 * penalizing recently repeated decisions to deliver authentic campaign variation.
 */

export interface CreativeMemoryEntry {
  orgId: string
  creativeId?: string
  archetype: string
  environment: string
  compositionGrid: string
  visualHook: string
  humanRole?: string
  colorTreatment: string
  backgroundTreatment: string
  createdAt: string
}

// In-memory cache for fast local retrieval across turns
const MEMORY_CACHE = new Map<string, CreativeMemoryEntry[]>()
const MAX_MEMORY_DEPTH = 5

export function recordCreativeMemory(entry: CreativeMemoryEntry): void {
  const list = MEMORY_CACHE.get(entry.orgId) || []
  list.unshift(entry)
  if (list.length > MAX_MEMORY_DEPTH) {
    list.pop()
  }
  MEMORY_CACHE.set(entry.orgId, list)
}

export function getRecentMemories(orgId: string): CreativeMemoryEntry[] {
  return MEMORY_CACHE.get(orgId) || []
}

/**
 * Calculates a repetition penalty (0 = completely fresh, 100 = completely repeated)
 * for a proposed archetype and composition against recent memory.
 */
export function calculateArchetypePenalty(
  orgId: string,
  candidateArchetype: string,
): { penaltyScore: number; reason?: string } {
  const memories = getRecentMemories(orgId)
  if (memories.length === 0) return { penaltyScore: 0 }

  // 1. Exact match on most recent generation
  if (memories[0]?.archetype === candidateArchetype) {
    return {
      penaltyScore: 85,
      reason: `Arketip ${candidateArchetype} bir önceki kampanyada doğrudan kullanıldı. Farklı bir görsel yaklaşım tercih edilmeli.`,
    }
  }

  // 2. Used in last 3 generations
  const recentIndex = memories.slice(0, 3).findIndex((m) => m.archetype === candidateArchetype)
  if (recentIndex !== -1) {
    return {
      penaltyScore: 50 - recentIndex * 15,
      reason: `Arketip ${candidateArchetype} son ${recentIndex + 1} kampanya içinde yer aldı.`,
    }
  }

  return { penaltyScore: 0 }
}

/**
 * Given a list of suitable archetypes for a sector/objective, selects the freshest candidate
 * that avoids recent repetition.
 */
export function selectFreshArchetype(
  orgId: string,
  preferredArchetypes: string[],
): string {
  if (preferredArchetypes.length === 0) return 'CINEMATIC_PRODUCT_HERO'

  let lowestPenalty = 999
  let selected = preferredArchetypes[0]

  for (const candidate of preferredArchetypes) {
    const { penaltyScore } = calculateArchetypePenalty(orgId, candidate)
    if (penaltyScore < lowestPenalty) {
      lowestPenalty = penaltyScore
      selected = candidate
    }
  }

  return selected
}

/**
 * Calculates repetition penalty for an environmental scene setting against recent memory.
 */
export function calculateEnvironmentPenalty(
  orgId: string,
  candidateEnvironmentName: string,
): number {
  const memories = getRecentMemories(orgId)
  if (memories.length === 0) return 0

  // 1. Exact match on most recent generation
  if (memories[0]?.environment === candidateEnvironmentName) {
    return 90
  }

  // 2. Used in last 3 generations
  const recentIndex = memories.slice(0, 3).findIndex((m) => m.environment === candidateEnvironmentName)
  if (recentIndex !== -1) {
    return 55 - recentIndex * 20
  }

  return 0
}

/**
 * Selects the freshest authentic environment profile that fits the archetype
 * and avoids recent visual repetition.
 */
export function selectFreshEnvironment(
  orgId: string,
  profiles: import('./sector-dna').SectorEnvironmentProfile[],
  preferredArchetype?: string,
): import('./sector-dna').SectorEnvironmentProfile | null {
  if (!profiles || profiles.length === 0) return null
  if (profiles.length === 1) return profiles[0]

  let bestScore = -9999
  let selected = profiles[0]

  for (const profile of profiles) {
    let score = 100 // baseline
    const penalty = calculateEnvironmentPenalty(orgId, profile.name)
    score -= penalty

    // Compatibility affinity with the chosen archetype
    if (preferredArchetype && profile.suitableArchetypes?.length) {
      if (profile.suitableArchetypes.includes(preferredArchetype)) {
        score += 30
      } else {
        score -= 20
      }
    }

    if (score > bestScore) {
      bestScore = score
      selected = profile
    }
  }

  return selected
}

