'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/org'

/** Pending/claimed job iptali (RLS: jobs_cancel_member). */
export async function cancelJob(jobId: number): Promise<{ error?: string }> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { error, count } = await supabase
      .from('jobs')
      .update({
        status: 'cancelled',
        error: 'Panelden iptal',
        finished_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .eq('org_id', org.id)
      .in('status', ['pending', 'claimed'])

    if (error) return { error: error.message }
    if (count === 0) return { error: 'İş iptal edilemedi (durum uygun değil).' }
    revalidatePath('/durum')
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

export async function cancelAllPendingJobs(): Promise<{ error?: string }> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { error } = await supabase
      .from('jobs')
      .update({
        status: 'cancelled',
        error: 'Panelden toplu iptal',
        finished_at: new Date().toISOString(),
      })
      .eq('org_id', org.id)
      .eq('status', 'pending')

    if (error) return { error: error.message }
    revalidatePath('/durum')
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}
