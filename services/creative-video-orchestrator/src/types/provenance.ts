export interface SceneAttemptRecord {
  attempt_number: number
  flow_project_id: string
  status: 'SUCCESS' | 'RETRY' | 'FAILED'
  error?: string
  media_ids?: string[]
  duration_seconds?: number
  created_at: string
}

export interface AttachedReferenceIdentity {
  asset_id: string
  org_id: string
  sha256: string
  role: string
  actual_flow_media_id: string
}

export interface CreativeProvenanceRecord {
  job_id: string
  org_id: string
  parent_job_id?: string
  brand_snapshot_version: string
  creative_plan_summary: string
  storyboard_plan_id?: string
  reference_registry_handles: string[]
  scene_prompts: Record<string, string> // scene_id -> prompt
  prompt_sha256: Record<string, string> // scene_id -> hash
  input_asset_sha256: Record<string, string> // handle/asset_id -> sha256
  keyframe_asset_ids: Record<string, string> // scene_id -> keyframe_id
  flow_project_id: string // strict scene_id -> unique flow_project_id
  flow_account_id?: string
  scene_output_ids: Record<string, string>
  scene_sha256: Record<string, string> // scene_id -> sha256
  final_output_sha256?: string
  qa_reports: Record<string, any>
  scene_attempts?: Record<string, SceneAttemptRecord[]> // scene_id -> list of all attempts
  attached_references?: AttachedReferenceIdentity[] // verified reference identity per asset
  created_at: string
  completed_at?: string
  verified: boolean
}
