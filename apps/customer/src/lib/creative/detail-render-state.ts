export function detailRenderState(input: {
  status: string; publicUrl?: string | null; livePublicUrl?: string | null
  error?: string | null; localError?: string | null; busyRender: boolean
}) {
  const failed = input.status === 'failed'
  const ready = !failed && Boolean(input.livePublicUrl || (input.status === 'ready' && input.publicUrl))
  const running = input.status === 'pending' || input.status === 'rendering'
  return {
    ready,
    // Authoritative failure wins over stale local state, even before effects flush.
    spinning: !failed && !ready && !input.localError && (running || input.busyRender),
    error: failed ? input.error || input.localError || 'Üretim başarısız oldu.' : input.localError || null,
  }
}

export function renderRemainingText(remainingSeconds: number) {
  return remainingSeconds > 0
    ? `Tahmini kalan süre: ~${remainingSeconds} sn`
    : 'Tahmini süre aşıldı; sağlayıcı sonucu henüz doğrulanmadı.'
}

export function hasConfirmedRenderResult(result: { ready?: boolean; publicUrl?: string | null }) {
  return result.ready === true && Boolean(result.publicUrl)
}

export function isUncertainImageFailure(error?: string | null) {
  return /operation.{0,20}abort|timed?\s*out|timeout|zaman\s*aşım|econnreset|socket\s*hang\s*up|fetch\s*failed/i.test(error || '')
}
