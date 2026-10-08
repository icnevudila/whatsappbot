export type QACategory =
  | 'SCENE_TRANSITION'
  | 'CAMERA_CONTINUITY'
  | 'PHYSICAL_SUPPORT'
  | 'OBJECT_INTERSECTION'
  | 'OBJECT_PERMANENCE'
  | 'SCALE_CONSISTENCY'
  | 'ACTION_CAUSALITY'
  | 'PRODUCT_FIDELITY'
  | 'BRAND_FIDELITY'
  | 'MOTION_REALISM'

export type QADecision = 'PASS' | 'NEEDS_REVIEW' | 'FAIL' | 'NOT_VERIFIED'

export type QASeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export interface PhysicalActionContract {
  subject: string
  object?: string
  actor?: string
  action: string
  environment: string
  support_surface: string
  contact_relationship: string
  motion_direction: string
  start_state: string
  end_state: string
  physical_constraints: string[]
  continuity_anchor: string
}

export interface PreFlightCheckResult {
  valid: boolean
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  suggestedActionCorrection?: string
  identifiedRisks: string[]
}

export interface QAFinding {
  category: QACategory
  severity: QASeverity
  confidence: number // 0.0 - 1.0
  timestamp_start: number
  timestamp_end: number
  evidence: string
  suggested_correction?: string
}

export interface VideoQAReport {
  job_id: string
  attempt_id: string
  raw_sha256: string
  reviewer_version: string
  evaluated_at: string
  decision: QADecision
  failure_reason?: string
  categories: {
    [key in QACategory]?: {
      decision: QADecision
      score: number | null // null when NOT_VERIFIED
      issues: string[]
    }
  }
  findings: QAFinding[]
  summary: {
    critical_errors: number
    warning_count: number
    requires_human_review: boolean
  }
}
