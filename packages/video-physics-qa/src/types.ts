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

export type CapabilityStatus = 'AVAILABLE' | 'CAPABILITY_UNAVAILABLE'

export interface PhysicalSupportReasoning {
  evaluated: boolean
  capability_status: CapabilityStatus
  target_question: string
  primary_actor?: string
  moved_object?: string
  apparent_support_surface?: string
  contact_relationship?: string
  structural_viability?: 'PLAUSIBLE' | 'IMPOSSIBLE_OR_PRECARIOUS' | 'UNVERIFIABLE'
  grounding_evidence?: string
  temporal_continuation?: string
  limitations: string[]
}

export interface ConsecutiveFrameInspection {
  timestamp: number
  frame_label: string
  dominant_entities: string[]
  support_base_state: string
  motion_state: 'DESCENDING' | 'RESTING' | 'DISCONTINUOUS' | 'STATIC' | 'UNKNOWN'
  contact_description: string
}

export interface VisualPhysicsReviewReport {
  video_path: string
  job_id: string
  sampling_rate_fps: number
  frames_analyzed: number
  vlm_capability_status: CapabilityStatus
  overall_decision: QADecision
  failure_reason?: string
  physical_support_reasoning: PhysicalSupportReasoning
  frame_sequence: ConsecutiveFrameInspection[]
  unseen_dataset_scenario?: string
}

export interface ContrastiveScenarioItem {
  id: string
  title: string
  video_path: string
  human_label: QADecision
  human_rationale: string
  temporal_decision: QADecision
  visual_physics_decision: QADecision
  physical_support_viable: boolean | 'UNVERIFIABLE'
  false_positive_risk: string
  false_negative_risk: string
}
