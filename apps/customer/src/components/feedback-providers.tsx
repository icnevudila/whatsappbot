'use client'

import type { ReactNode } from 'react'
import { BusyProvider } from '@/components/busy'
import { ConfirmProvider } from '@/components/confirm-dialog'
import { ToastProvider } from '@/components/toast'

/** Onay modalı + toast + işlem progress — panel shell. */
export function FeedbackProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <BusyProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </BusyProvider>
    </ToastProvider>
  )
}
