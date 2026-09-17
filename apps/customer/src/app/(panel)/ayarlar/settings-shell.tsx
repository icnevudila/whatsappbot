import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui'

export function SettingsPageFrame({
  title,
  description,
  action,
  titleEnd,
  children,
  backHref = '/ayarlar',
  backLabel = 'Ayarlar',
}: {
  title: string
  description?: string
  action?: ReactNode
  titleEnd?: ReactNode
  children: ReactNode
  wide?: boolean
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="wb-wa-page">
      <PageHeader
        title={title}
        description={description}
        action={action}
        titleEnd={titleEnd}
        backHref={backHref}
        backLabel={backLabel}
      />
      {children}
    </div>
  )
}
