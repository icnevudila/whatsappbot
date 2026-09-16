import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { enqueueJob } from '@/lib/jobs'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const body = (await req.json().catch(() => ({}))) as { accountId?: string; all?: boolean }

    if (body.accountId) {
      // Tek hat yeniden bağlan
      const { error } = await enqueueJob({
        type: 'account.connect',
        accountId: body.accountId,
        priority: 10,
      })
      if (error) return NextResponse.json({ success: false, error }, { status: 400 })
      return NextResponse.json({ success: true, message: 'Hat bağlantı isteği kuyruğa alındı' })
    }

    // Tüm bağlı/etkin hatları yeniden bağla
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('org_id', org.id)
      .eq('enabled', true)

    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        await enqueueJob({
          type: 'account.connect',
          accountId: acc.id,
          priority: 10,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${accounts?.length ?? 0} adet hat için yeniden bağlanma tetiklendi`,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'İşlem başarısız' },
      { status: 500 },
    )
  }
}
