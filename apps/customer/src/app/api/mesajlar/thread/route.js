import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { filterThread, loadThreadBundle } from '@/lib/chat-store'

export const runtime = 'nodejs'

export async function GET(request) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const phone = request.nextUrl.searchParams.get('tel') ?? ''
    if (!phone) return NextResponse.json({ thread: [], accountLabels: {} })
    const bundle = await loadThreadBundle(supabase, org.id, phone)
    return NextResponse.json({
      thread: filterThread(bundle.msgs, null, null),
      accountLabels: {},
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sohbet açılamadı.'
    if (message === 'NO_ORGANIZATION' || message === 'Oturum bulunamadı.') {
      return NextResponse.json({ error: 'Oturum gerekli.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Sohbet açılamadı.' }, { status: 500 })
  }
}
