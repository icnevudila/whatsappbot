import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { BlacklistBoard } from './blacklist-board'

export const metadata: Metadata = { title: 'Kara liste' }
export const dynamic = 'force-dynamic'

export default async function BlacklistPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const { data } = await supabase
    .from('blacklist')
    .select('id, phone_e164, reason, created_at')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        title="Kara liste"
        description="Bu numaralara hiçbir kampanya veya hızlı gönderim mesajı gönderilmez. Servis hedefleri oluştururken bunları otomatik atlar."
      />
      <BlacklistBoard initial={data ?? []} />
    </>
  )
}
