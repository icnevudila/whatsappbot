'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

type LiveRow = {
  id: number
  direction: string
  phone_e164: string | null
  remote_jid: string | null
  body: string | null
  message_type: string
  status: string
}

function phoneLabel(row: LiveRow): string {
  if (row.phone_e164) return row.phone_e164
  if (row.remote_jid) return row.remote_jid.replace(/@lid$/, '')
  return 'bilinmeyen'
}

function preview(row: LiveRow): string {
  const text = row.body?.trim()
  if (text) return text.length > 72 ? `${text.slice(0, 69)}…` : text
  return `(${row.message_type || 'mesaj'})`
}

/**
 * Panel genelinde gelen/giden INSERT (+ anlamlı ACK) için anlık toast.
 * Sayfa yenilemesi board'larda kalır; burada sadece "tak" bildirimi.
 */
export function MessageLiveToast({ orgId }: { orgId: string }) {
  const toast = useToast()

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const seenInserts = new Set<number>()
    const lastStatus = new Map<number, string>()

    const channel = supabase
      .channel(`panel-live-toast:${orgId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_log',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as LiveRow
          if (row.direction !== 'in' && row.direction !== 'out') return
          if (seenInserts.has(row.id)) return
          seenInserts.add(row.id)
          if (seenInserts.size > 80) {
            const first = seenInserts.values().next().value
            if (typeof first === 'number') seenInserts.delete(first)
          }

          const who = phoneLabel(row)
          const text = preview(row)
          if (row.direction === 'in') {
            toast(`Yeni gelen · ${who}: ${text}`, 'success')
          } else {
            toast(`Giden sırada · ${who}: ${text}`, 'accent')
          }
          lastStatus.set(row.id, row.status)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_log',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as LiveRow
          if (row.direction !== 'out') return
          const prev = lastStatus.get(row.id)
          lastStatus.set(row.id, row.status)
          if (prev === row.status) return

          const who = phoneLabel(row)
          if (row.status === 'delivered' || row.status === 'read') {
            toast(`İletildi · ${who}`, 'success')
          } else if (row.status === 'failed' || row.status === 'skipped') {
            toast(`Gönderilemedi · ${who}`, 'danger')
          } else if (row.status === 'sent' && prev && prev !== 'sent') {
            toast(`Gönderildi · ${who}`, 'accent')
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, toast])

  return null
}
