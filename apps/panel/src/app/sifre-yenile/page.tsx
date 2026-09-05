import { AuthShell } from '@/components/auth-shell'
import { PasswordForm } from '../sifremi-unuttum/password-form'
export const metadata = { title: 'Şifre yenile', robots: { index: false, follow: false } }
export default function ResetPasswordPage() { return <AuthShell><PasswordForm update /></AuthShell> }
