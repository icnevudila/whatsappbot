'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'

async function requireAdmin() {
  const ctx = await requireActiveOrg()
  if (!isOrgAdminRole(ctx.org.role)) {
    throw new Error('FORBIDDEN')
  }
  return ctx
}

export async function createAutoReplyRule(formData: FormData) {
  const { org, supabase, userId } = await requireAdmin()
  const name = String(formData.get('name') ?? '').trim() || 'Kural'
  const matchMode = String(formData.get('match_mode') ?? 'contains').trim()
  const matchPattern = String(formData.get('match_pattern') ?? '').trim()
  const replyBody = String(formData.get('reply_body') ?? '').trim()
  const cooldown = Number(formData.get('cooldown_seconds') ?? 3600)

  if (!replyBody) return
  if (!['contains', 'equals', 'regex', 'any'].includes(matchMode)) return

  await supabase.from('auto_reply_rules').insert({
    org_id: org.id,
    created_by: userId,
    name,
    enabled: true,
    match_mode: matchMode,
    match_pattern: matchPattern,
    reply_body: replyBody,
    cooldown_seconds: Number.isFinite(cooldown) ? Math.max(0, cooldown) : 3600,
    priority: 100,
  })

  revalidatePath('/ayarlar/otomatik-yanit')
}

export async function deleteAutoReplyRule(formData: FormData) {
  const { org, supabase } = await requireAdmin()
  const ruleId = String(formData.get('rule_id') ?? '').trim()
  if (!ruleId) return

  await supabase
    .from('auto_reply_rules')
    .delete()
    .eq('id', ruleId)
    .eq('org_id', org.id)

  revalidatePath('/ayarlar/otomatik-yanit')
}

export async function setAutoReplyRuleEnabled(formData: FormData) {
  const { org, supabase } = await requireAdmin()
  const ruleId = String(formData.get('rule_id') ?? '').trim()
  const enabled = String(formData.get('enabled') ?? '') === '1'
  if (!ruleId) return

  await supabase
    .from('auto_reply_rules')
    .update({ enabled })
    .eq('id', ruleId)
    .eq('org_id', org.id)

  revalidatePath('/ayarlar/otomatik-yanit')
}

export async function updateAutoReplySettings(formData: FormData) {
  const { org, supabase } = await requireAdmin()

  const enabled = String(formData.get('auto_reply_enabled') ?? '') === '1'
  const contactPolicy = String(formData.get('auto_reply_contact_policy') ?? 'unknown_only').trim()
  const schedule = String(formData.get('auto_reply_schedule') ?? 'always').trim()
  const silenceMinutes = Math.max(0, Math.min(1440, Number(formData.get('auto_reply_operator_silence_minutes') ?? 30)))
  const escalationMessage = String(
    formData.get('auto_reply_escalation_message') ??
      'Talebinizi aldık. Sizi müşteri temsilcimize aktarıyorum, en kısa sürede sizinle iletişime geçilecektir.',
  ).trim()

  const validPolicy = contactPolicy === 'all' ? 'all' : 'unknown_only'
  const validSchedule = ['always', 'outside_hours', 'working_hours'].includes(schedule) ? schedule : 'always'

  await supabase
    .from('organizations')
    .update({
      auto_reply_enabled: enabled,
      auto_reply_contact_policy: validPolicy,
      auto_reply_schedule: validSchedule,
      auto_reply_operator_silence_minutes: Number.isFinite(silenceMinutes) ? silenceMinutes : 30,
      auto_reply_escalation_message: escalationMessage,
    } as never)
    .eq('id', org.id)

  revalidatePath('/ayarlar/otomatik-yanit')
  revalidatePath('/ayarlar')
}

