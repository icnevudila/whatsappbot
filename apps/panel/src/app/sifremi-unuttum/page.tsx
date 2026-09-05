import { AuthShell } from '@/components/auth-shell'
import { PasswordForm } from './password-form'
export const metadata = { title: 'Şifremi unuttum', robots: { index: false, follow: false } }
export default function ForgotPasswordPage() { return <AuthShell><PasswordForm /></AuthShell> }
