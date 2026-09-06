import { NextResponse } from 'next/server'
import { requirePlatformAdmin } from '@/lib/org'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const { org, supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase
      .from('campaigns')
      .select(
        'name, status, total_targets, sent_count, failed_count, skipped_count, created_at, started_at, completed_at',
      )
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(500)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const header =
      'name,status,total_targets,sent_count,failed_count,skipped_count,created_at,started_at,completed_at'
    const lines = (data ?? []).map((row) =>
      [
        csv(row.name),
        csv(row.status),
        row.total_targets,
        row.sent_count,
        row.failed_count,
        row.skipped_count,
        csv(row.created_at),
        csv(row.started_at),
        csv(row.completed_at),
      ].join(','),
    )

    const body = [header, ...lines].join('\n')
    return new NextResponse(body, {
      status: 200,
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="filo-campaigns-${org.slug}.csv"`,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Oturum yok' }, { status: 401 })
  }
}

function csv(value: string | null | undefined): string {
  const s = value ?? ''
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}
