import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupGuideCard } from '../setup-banner'

export const metadata: Metadata = { title: 'Başlangıç' }
export const dynamic = 'force-dynamic'

/**
 * Üye kurulum rehberi — menüyü kilitlemez.
 * Net 2 adım: hat → kişiler.
 */
export default async function SetupPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let isPlatformAdmin = false
  try {
    ;({ org, isPlatformAdmin } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  if (isPlatformAdmin) {
    redirect('/ozet')
  }

  const progress = await getSetupProgress(org.id)

  return (
    <>
      <PageHeader
        title="Başlangıç"
        description={`${org.name} · gönderime hazır olmak için 2 adım`}
        action={<QuietLink href="/ozet">Ana sayfa</QuietLink>}
      />
      <SetupGuideCard progress={progress} variant="page" />
      <p className="mt-3 text-center text-[12px] text-ink-faint">Takılırsan destek@filo.app</p>
    </>
  )
}
