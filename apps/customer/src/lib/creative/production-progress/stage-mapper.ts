import {
  CANONICAL_VIDEO_STAGES,
  TERMINAL_STAGES,
  type ProductionStageKey,
  type StageDefinition,
} from './progress-types'

export interface MappedStageResult {
  stage_key: ProductionStageKey
  stage_index: number
  stage_count: number
  display_title: string
  display_message: string
  detail_hint: string
  is_terminal: boolean
  progress_mode: 'determinate' | 'indeterminate'
}

/**
 * Maps raw backend engine states to canonical user-facing stages.
 * Fully authoritative: never invents pseudo-stages or maps visual QA to outro branding.
 */
export function mapEngineStateToStage(rawState: string | null | undefined): MappedStageResult {
  const normalized = (rawState || '').trim().toUpperCase()

  switch (normalized) {
    case 'PENDING':
    case 'VALIDATING_INPUTS': {
      const stage = CANONICAL_VIDEO_STAGES[0]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: false,
        progress_mode: 'indeterminate',
      }
    }

    case 'QUEUED': {
      const stage = CANONICAL_VIDEO_STAGES[1]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: false,
        progress_mode: 'indeterminate',
      }
    }

    case 'LEASED':
    case 'PREPARING_ENV':
    case 'OPENING_PROJECT':
    case 'ATTACHING_INGREDIENTS':
    case 'INGREDIENTS_VERIFIED': {
      const stage = CANONICAL_VIDEO_STAGES[2]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: false,
        progress_mode: 'determinate',
      }
    }

    case 'GENERATING':
    case 'POLLING_FLOW': {
      const stage = CANONICAL_VIDEO_STAGES[3]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: false,
        progress_mode: 'determinate',
      }
    }

    case 'DOWNLOADING_MEDIA':
    case 'MEDIA_PROCESSING':
    case 'MEDIA_DOWNLOADED': {
      const stage = CANONICAL_VIDEO_STAGES[4]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: false,
        progress_mode: 'determinate',
      }
    }

    case 'FFPROBE_INSPECTING':
    case 'SHA256_VERIFYING':
    case 'QUALITY_CHECK':
    case 'VISUAL_QA_EVALUATING': {
      // VISUAL_QA_EVALUATING is strictly quality inspection, NEVER outro branding
      const stage = CANONICAL_VIDEO_STAGES[5]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: false,
        progress_mode: 'determinate',
      }
    }

    case 'COMPLETED': {
      const stage = CANONICAL_VIDEO_STAGES[6]
      return {
        stage_key: stage.key,
        stage_index: stage.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: stage.title,
        display_message: stage.description,
        detail_hint: stage.detailHint,
        is_terminal: true,
        progress_mode: 'determinate',
      }
    }

    case 'NEEDS_REVIEW': {
      const terminal = TERMINAL_STAGES.NEEDS_REVIEW
      return {
        stage_key: terminal.key,
        stage_index: terminal.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: terminal.title,
        display_message: terminal.description,
        detail_hint: terminal.detailHint,
        is_terminal: true,
        progress_mode: 'determinate',
      }
    }

    case 'FAILED': {
      const terminal = TERMINAL_STAGES.FAILED
      return {
        stage_key: terminal.key,
        stage_index: terminal.index,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: terminal.title,
        display_message: terminal.description,
        detail_hint: terminal.detailHint,
        is_terminal: true,
        progress_mode: 'determinate',
      }
    }

    default: {
      // Conservative fallback
      const stage = CANONICAL_VIDEO_STAGES[1]
      return {
        stage_key: 'QUEUED',
        stage_index: 2,
        stage_count: CANONICAL_VIDEO_STAGES.length,
        display_title: 'İşleniyor',
        display_message: 'Prodüksiyon aşaması devam ediyor.',
        detail_hint: 'Stüdyo işlemi sürüyor',
        is_terminal: false,
        progress_mode: 'indeterminate',
      }
    }
  }
}
