'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type ToastTone = 'accent' | 'success' | 'danger' | 'warn'

type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

type ToastFn = (message: string, tone?: ToastTone) => void

const ToastContext = createContext<ToastFn | null>(null)

export function useToast(): ToastFn {
  const fn = useContext(ToastContext)
  if (!fn) {
    throw new Error('useToast yalnızca FeedbackProviders içinde kullanılabilir.')
  }
  return fn
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const push = useCallback((message: string, tone: ToastTone = 'accent') => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setItems((current) => [...current.slice(-3), { id, message, tone }])
  }, [])

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="wb-toast-stack" aria-live="polite" aria-relevant="additions">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} onDone={() => dismiss(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastCard({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 3200)
    return () => clearTimeout(timer)
  }, [onDone])

  return (
    <div className={`wb-toast wb-toast--${item.tone}`} role="status">
      <p>{item.message}</p>
      <button type="button" className="wb-toast-close" aria-label="Kapat" onClick={onDone}>
        ×
      </button>
    </div>
  )
}
