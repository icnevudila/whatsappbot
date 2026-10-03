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
