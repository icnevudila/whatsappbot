import type { ReactNode } from 'react'
import { PageHeader } from '@/components/ui'

export function SettingsPageFrame({
  title,
  description,
  action,
  children,
  wide = false,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <div className={`mx-auto w-full space-y-2.5 ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
      <PageHeader
        title={title}
        description={description}
        action={action}
        backHref="/ayarlar"
        backLabel="Ayarlar"
      />
      {children}
    </div>
  )
}
