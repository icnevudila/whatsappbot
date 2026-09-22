/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * CREATIVE MEMORY & REPETITION FILTER (V6)
 * 
 * Kesin İlke:
 * Random != Creative.
 * Date.now() % length veya Math.random() ile yaratıcı yönetmenlik yapılamaz.
 * Son 10-30 tamamlanmış reklamın kreatif parmak izi analiz edilerek
 * aşırı kullanılan klişeler tespit edilir ve yeni üretime yasaklı filtre olarak verilir.
 */

import type { CreativeFingerprint, CreativeMemoryEvaluation } from './creative-types'

export class CreativeMemoryStore {
  private history: Map<string, CreativeFingerprint[]> = new Map()

  /**
   * Tamamlanmış bir işin parmak izini kaydeder.
   */
  recordFingerprint(fingerprint: CreativeFingerprint): void {
    if (!fingerprint || !fingerprint.orgId) return
    const list = this.history.get(fingerprint.orgId) || []
    list.push(fingerprint)
    // En fazla son 30 işi hafızada tut
    if (list.length > 30) list.shift()
    this.history.set(fingerprint.orgId, list)
  }

  /**
   * Geçmiş işleri inceleyerek aşırı kullanılan klişeleri ve novelty skorunu hesaplar.
   */
  evaluateMemory(
    orgId: string,
    historyLimit = 10,
    externalHistory?: CreativeFingerprint[]
  ): CreativeMemoryEvaluation {
    const records = externalHistory && externalHistory.length > 0
      ? externalHistory
      : (this.history.get(orgId) || [])

    const recent = records.slice(-historyLimit)

    if (recent.length === 0) {
      return {
        noveltyScore: 100,
        avoidRecentPatterns: [],
        frequentTropesDetected: {},
      }
    }

    const counts: Record<string, number> = {}

    for (const f of recent) {
      if (f.hookType) counts[f.hookType] = (counts[f.hookType] || 0) + 1
      if (f.conceptFamily) counts[f.conceptFamily] = (counts[f.conceptFamily] || 0) + 1
      if (f.endingType) counts[f.endingType] = (counts[f.endingType] || 0) + 1
      if (f.storyArchetype) counts[f.storyArchetype] = (counts[f.storyArchetype] || 0) + 1

      if (Array.isArray(f.lightingStyles)) {
        for (const l of f.lightingStyles) counts[l] = (counts[l] || 0) + 1
      }
      if (Array.isArray(f.cameraPatterns)) {
        for (const c of f.cameraPatterns) counts[c] = (counts[c] || 0) + 1
      }
      if (Array.isArray(f.environments)) {
        for (const e of f.environments) counts[e] = (counts[e] || 0) + 1
      }
      if (Array.isArray(f.humanActions)) {
        for (const a of f.humanActions) counts[a] = (counts[a] || 0) + 1
      }
    }

    const avoidRecentPatterns: string[] = []
    let totalExcess = 0

    // Eşik değerler: Son 10 işte 3 veya daha fazla tekrar eden kalıplar men edilir
    for (const [trope, count] of Object.entries(counts)) {
      if (count >= 3) {
        avoidRecentPatterns.push(trope)
        totalExcess += (count - 2) * 8
      }
    }

    const noveltyScore = Math.max(15, Math.min(100, 100 - totalExcess))

    return {
      noveltyScore,
      avoidRecentPatterns,
      frequentTropesDetected: counts,
    }
  }
}

// Global Singleton
export const globalCreativeMemory = new CreativeMemoryStore()
