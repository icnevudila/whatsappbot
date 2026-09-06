'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/org'

export type AutoReplyState = { error?: string; ok?: string } | null

export async function createAutoReplyRule(
  _prev: AutoReplyState,
  formData: FormData,
): Promise<AutoReplyState> {
  const name = String(formData.get('name') ?? 'Kural').trim() || 'Kural'
  const matchMode = String(formData.get('match_mode') ?? 'contains').trim()
  const matchPattern = String(formData.get('match_pattern') ?? '').trim()
  const replyBody = String(formData.get('reply_body') ?? '').trim()
  const cooldown = Number(formData.get('cooldown_seconds') ?? 3600)

  if (!replyBody) return { error: 'Yanıt metni gerekli.' }
  if (matchMode !== 'any' && !matchPattern) return { error: 'Eşleşme deseni gerekli.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner' && org.role !== 'admin') {
      return { error: 'Yalnızca yönetici kural ekleyebilir.' }
    }
    const { error } = await supabase.from('auto_reply_rules' as never).insert({
      org_id: org.id,
      created_by: userId,
      name,
      match_mode: matchMode,
      match_pattern: matchPattern,
      reply_body: replyBody,
      cooldown_seconds: Number.isFinite(cooldown) ? Math.max(0, cooldown) : 3600,
    } as never)
    if (error) return { error: error.message }
    revalidatePath('/ayarlar/otomatik-yanit')
    return { ok: 'Kural eklendi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

export async function setAutoReplyRuleEnabled(
  id: string,
  enabled: boolean,
): Promise<AutoReplyState> {
  try {
    const { org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner' && org.role !== 'admin') {
      return { error: 'Yetki yok.' }
    }
    const { error } = await supabase
      .from('auto_reply_rules' as never)
      .update({ enabled } as never)
      .eq('id' as never, id as never)
      .eq('org_id' as never, org.id as never)
    if (error) return { error: error.message }
    revalidatePath('/ayarlar/otomatik-yanit')
    return { ok: enabled ? 'Kural açıldı.' : 'Kural kapatıldı.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

export async function deleteAutoReplyRule(id: string): Promise<AutoReplyState> {
  try {
    const { org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner' && org.role !== 'admin') {
      return { error: 'Yetki yok.' }
    }
    const { error } = await supabase
      .from('auto_reply_rules' as never)
      .delete()
      .eq('id' as never, id as never)
      .eq('org_id' as never, org.id as never)
    if (error) return { error: error.message }
    revalidatePath('/ayarlar/otomatik-yanit')
    return { ok: 'Silindi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}
