/** Database unique index is the arbiter; never fall back to a second insert. */
export async function enqueueCreativeRender(db: any, input: {
  orgId: string; userId: string; creativeId: string; payload: unknown; priority: number;
}): Promise<{ id: string | null; error: string | null }> {
  const { data: creative, error: ownershipError } = await db.from('creatives')
    .select('id').eq('org_id', input.orgId).eq('id', input.creativeId).maybeSingle()
  if (ownershipError || !creative) return { id: null, error: 'Üretim kaydı bu işletmeye ait değil.' }
  const { data, error } = await db.from('jobs').insert({
    org_id: input.orgId, created_by: input.userId, type: 'creative.render',
    payload: input.payload, priority: input.priority,
  }).select('id').single()
  if (!error) return { id: data?.id != null ? String(data.id) : null, error: null }
  if (error.code !== '23505') return { id: null, error: error.message || 'Üretim kuyruğu açılamadı.' }
  const { data: existing, error: readError } = await db.from('jobs').select('id')
    .eq('org_id', input.orgId).eq('type', 'creative.render')
    .contains('payload', { creative_id: input.creativeId })
    .in('status', ['pending', 'claimed', 'running']).maybeSingle()
  return existing && !readError
    ? { id: String(existing.id), error: null }
    : { id: null, error: 'İşin durumu değişti. Kütüphaneden üretim durumunu kontrol edin.' }
}
