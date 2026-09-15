import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { AutoReplyCard } from './auto-reply-card'

export const metadata: Metadata = { title: 'Otomatik Yanıt' }

export default async function AutoReplySettingsPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const canManage = org.role === 'owner' || org.role === 'admin'

  return (
    <SettingsPageFrame
      title="Otomatik Yanıt & Öneriler"
      description="Yapay zeka yanıt önerileri ve otomatik mesajlaşma ayarları."
    >
      <AutoReplyCard
        initialEnabled={Boolean(org.auto_reply_enabled)}
        canManage={canManage}
      />
    </SettingsPageFrame>
  )
}
