import type { ReactNode } from 'react'

/** template her navigasyonda remount olur — snappy page enter. */
export default function PanelTemplate({ children }: { children: ReactNode }) {
  return <div className="wb-page-enter">{children}</div>
}
