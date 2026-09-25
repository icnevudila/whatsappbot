import { checkIsAuthenticated } from './auth'
import { LockScreen } from './lock-screen'

export default async function CanliTakipLayout({ children }: { children: React.ReactNode }) {
  if (!(await checkIsAuthenticated())) return <LockScreen />
  return <>{children}</>
}
