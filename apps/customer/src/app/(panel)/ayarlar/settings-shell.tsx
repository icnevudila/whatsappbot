import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui'

export function SettingsPageFrame({
  title,
  description,
  action,
  titleEnd,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  titleEnd?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className="wb-wa-page">
      <PageHeader
        title={title}
        description={description}
        action={action}
        titleEnd={titleEnd}
        backHref="/ayarlar"
        backLabel="Ayarlar"
      />
      {children}
    </div>
  )
}
