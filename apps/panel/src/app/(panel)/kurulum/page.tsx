import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'

export const metadata: Metadata = { title: 'Kurulum' }
export const dynamic = 'force-dynamic'

/**
 * Eski /kurulum bookmark ve davet linkleri için ince yönlendirici.
 * Ayrı wizard yok — iş Hatlar / Kişiler / Marka’da.
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
    redirect('/admin')
  }

  const progress = await getSetupProgress(org.id)

  if (progress.allDone) {
    redirect('/ozet')
  }

  switch (progress.nextStep) {
    case 'connected':
      redirect('/hesaplar')
    case 'contacts':
      redirect('/kisiler')
    case 'brand':
      redirect('/marka-kiti')
    default:
      redirect('/ozet')
  }
}
