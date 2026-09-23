import type { CreativeFingerprint } from '../strategy/creative-diversity-guard.js'

export type HumanFeedbackVerdict = 'APPROVED' | 'REJECTED'

export interface CreativeHumanFeedback {
  org_id: string
  job_id: string
  creative_revision_id: string
  verdict: HumanFeedbackVerdict
  reasons: string[] // e.g. ['MINI_FILM_NOT_AD', 'TOO_SLOW', 'PRODUCT_VISIBLE_TOO_LATE']
  free_text?: string | null
  creative_fingerprint: CreativeFingerprint
  created_at: string
}

export interface HumanLearnedPreferences {
  approved_trends: string[]
  rejected_traits: string[]
}

export class HumanFeedbackStore {
  private feedbackHistory: CreativeHumanFeedback[] = []

  public recordFeedback(feedback: CreativeHumanFeedback): void {
    this.feedbackHistory.push(feedback)
  }

  public getLearnedPreferences(org_id: string): HumanLearnedPreferences {
    const orgFeedback = this.feedbackHistory.filter(f => f.org_id === org_id)
    const approved = orgFeedback.filter(f => f.verdict === 'APPROVED')
    const rejected = orgFeedback.filter(f => f.verdict === 'REJECTED')

    const approved_trends: string[] = []
    for (const f of approved) {
      if (f.creative_fingerprint.opening_visual_type) {
        approved_trends.push(`opening:${f.creative_fingerprint.opening_visual_type}`)
      }
      if (f.creative_fingerprint.camera_pattern) {
        approved_trends.push(`camera:${f.creative_fingerprint.camera_pattern}`)
      }
      if (f.creative_fingerprint.speech_structure) {
        approved_trends.push(`speech:${f.creative_fingerprint.speech_structure}`)
      }
    }

    const rejected_traits: string[] = []
    for (const f of rejected) {
      rejected_traits.push(...f.reasons)
      if (f.creative_fingerprint.format_variant) {
        rejected_traits.push(`avoid_variant:${f.creative_fingerprint.format_variant}`)
      }
    }

    return {
      approved_trends: Array.from(new Set(approved_trends)),
      rejected_traits: Array.from(new Set(rejected_traits)),
    }
  }

  public getAllFeedback(org_id?: string): CreativeHumanFeedback[] {
    if (!org_id) return [...this.feedbackHistory]
    return this.feedbackHistory.filter(f => f.org_id === org_id)
  }
}

export const globalHumanFeedbackStore = new HumanFeedbackStore()
