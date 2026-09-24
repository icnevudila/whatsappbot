export interface OutputProvenanceRecord {
  output_id: string
  job_id: string
  raw_sha256?: string
  final_sha256: string
  parent_output_id?: string
  source_attempt_id?: string
  created_at: string
}

export interface DuplicateDetectionResult {
  isDuplicate: boolean
  duplicateOf?: string
  failureCode?: 'DUPLICATE_OUTPUT'
  message?: string
}

/**
 * DuplicateOutputDetector.
 * Detects byte-for-byte or provenance-level clone outputs across creative generation runs.
 *
 * Rules:
 * 1. A renamed copy must NOT be reported as a newly generated creative variant.
 * 2. When a supposed new variant has the same final SHA as an earlier output,
 *    classify as DUPLICATE_OUTPUT.
 * 3. Duplicates may still be stored/referenced, but must NOT count as a new creative
 *    or diversity proof.
 */
export class DuplicateOutputDetector {
  private static instance: DuplicateOutputDetector
  private history: OutputProvenanceRecord[] = []

  public static getInstance(): DuplicateOutputDetector {
    if (!DuplicateOutputDetector.instance) {
      DuplicateOutputDetector.instance = new DuplicateOutputDetector()
    }
    return DuplicateOutputDetector.instance
  }

  public recordOutput(record: OutputProvenanceRecord): DuplicateDetectionResult {
    const existing = this.history.find(h => h.final_sha256 === record.final_sha256 && h.output_id !== record.output_id)
    this.history.push(record)

    if (existing) {
      return {
        isDuplicate: true,
        duplicateOf: existing.output_id,
        failureCode: 'DUPLICATE_OUTPUT',
        message: `DUPLICATE_OUTPUT: Output "${record.output_id}" is byte-for-byte identical to existing output "${existing.output_id}" (SHA256: ${record.final_sha256.slice(0, 16)}...). Must not count as a new creative variant.`,
      }
    }

    return { isDuplicate: false }
  }

  public checkDuplicate(finalSha256: string, currentOutputId?: string): DuplicateDetectionResult {
    const existing = this.history.find(h => h.final_sha256 === finalSha256 && (!currentOutputId || h.output_id !== currentOutputId))
    if (existing) {
      return {
        isDuplicate: true,
        duplicateOf: existing.output_id,
        failureCode: 'DUPLICATE_OUTPUT',
        message: `DUPLICATE_OUTPUT: SHA256 ${finalSha256.slice(0, 16)} matches existing output "${existing.output_id}".`,
      }
    }
    return { isDuplicate: false }
  }

  public clear(): void {
    this.history = []
  }

  public getHistory(): OutputProvenanceRecord[] {
    return [...this.history]
  }
}
