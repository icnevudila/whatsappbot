import { checkIsAuthenticated } from './auth'
import { LockScreen } from './lock-screen'
import { ControlPlaneShell } from './control-plane-shell'

export default async function CanliTakipLayout({ children }: { children: React.ReactNode }) {
  if (!(await checkIsAuthenticated())) return <LockScreen />
  return <ControlPlaneShell>{children}</ControlPlaneShell>
}
