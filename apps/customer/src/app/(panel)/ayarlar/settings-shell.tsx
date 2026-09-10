import type { ReactNode } from 'react'
import { Icon } from '@/components/icon'
import { PageHeader, QuietLink } from '@/components/ui'

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
      <QuietLink href="/ayarlar" className="h-8 px-2.5 text-[12.5px] font-medium">
        <Icon name="back" className="size-3.5" />
        Ayarlar
      </QuietLink>
      <PageHeader title={title} description={description} action={action} />
      {children}
    </div>
  )
}
