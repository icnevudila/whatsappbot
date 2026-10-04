export async function runCreativeRenderCallback(options: {
  creativeId: string
  jobId: string
  token: string
  appUrl: string
}): Promise<{ state: 'complete' | 'pending' | 'failed'; error?: string }> {
  const response = await fetch(`${options.appUrl.replace(/\/$/,'')}/api/internal/creative-render`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', authorization: `Bearer ${options.token}`, 'x-creative-job-id': options.jobId },
    body: JSON.stringify({ creativeId: options.creativeId }), signal: AbortSignal.timeout(150000),
  })
  const result = await response.json().catch(() => null) as { ok?: boolean; pending?: boolean; error?: string } | null
  if (response.status === 202 || response.status === 503 || result?.pending) return { state:'pending' }
  if (response.ok && result?.ok) return { state:'complete' }
  if ((response.status === 400 || response.status === 401 || response.status === 403 || response.status === 502) && result?.error) return { state:'failed', error:result.error }
  return { state:'pending', error:'Render endpoint unavailable; production was not restarted.' }
}
