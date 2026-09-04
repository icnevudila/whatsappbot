import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { BlacklistBoard } from './blacklist-board'

export const metadata: Metadata = { title: 'Kara liste' }
export const dynamic = 'force-dynamic'

export default async function BlacklistPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const { data } = await supabase
    .from('blacklist')
    .select('id, phone_e164, reason, created_at')
    .order('created_at', { ascending: false })

  return (
    <>
      <PageHeader
        title="Kara liste"
        description="Bu numaralara hiçbir kampanya veya hızlı gönderim mesaj gitmez. Servis hedefleri oluştururken bunları otomatik atlar."
      />
      <BlacklistBoard initial={data ?? []} />
    </>
  )
}
