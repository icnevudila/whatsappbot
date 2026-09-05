import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { AutoReplyManager } from './auto-reply-manager'

export const metadata: Metadata = { title: 'Otomatik yanıt' }

type Rule = {
  id: string
  name: string
  match_mode: string
  match_pattern: string
  reply_body: string
  cooldown_seconds: number
  enabled: boolean
}

export default async function AutoReplyPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const canEdit = org.role === 'owner' || org.role === 'admin'
  const { data } = await supabase
    .from('auto_reply_rules' as never)
    .select(
      'id, name, match_mode, match_pattern, reply_body, cooldown_seconds, enabled' as never,
    )
    .eq('org_id' as never, org.id as never)
    .order('priority' as never)

  const rules = (data as Rule[] | null) ?? []

  return (
    <>
      <PageHeader
        title="Otomatik yanıt"
        description="Gelen mesajlara kurala göre yanıt kuyruğa alınır."
        action={<QuietLink href="/ayarlar">← Ayarlar</QuietLink>}
      />
      <AutoReplyManager rules={rules} canEdit={canEdit} />
    </>
  )
}
