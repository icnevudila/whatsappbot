export function assertFinalMasterContract(raw: { duration: number }, final: { duration: number; width: number; height: number }, rawSha: string, finalSha: string) {
  if (!Number.isFinite(raw.duration) || Math.abs(raw.duration - 8) > 0.1) throw new Error('RAW_VEO_DURATION_INVALID')
  if (!Number.isFinite(final.duration) || Math.abs(final.duration - 10) > 0.1) throw new Error('FINAL_MASTER_DURATION_INVALID')
  if (final.width < 720 || final.height < 1280 || Math.abs(final.width / final.height - 9 / 16) > 0.01) throw new Error('FINAL_MASTER_RESOLUTION_INVALID')
  if (![rawSha, finalSha].every(sha => /^[a-f0-9]{64}$/i.test(sha)) || rawSha.toLowerCase() === finalSha.toLowerCase()) throw new Error('FINAL_MASTER_IDENTITY_INVALID')
}
