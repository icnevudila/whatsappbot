import { SettingsPrefetch } from './settings-prefetch'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SettingsPrefetch />
      {children}
    </>
  )
}
