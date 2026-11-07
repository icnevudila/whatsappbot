import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth-shell'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'
export const metadata:Metadata={title:'Giriş Yap',description:'Mesajify hesabınıza giriş yapın; listelerinizi, WhatsApp kampanyalarınızı ve konuşmalarınızı yönetin.',robots:{index:false,follow:false}}
export default function LoginPage(){return <AuthShell><AuthModeCopy/><Suspense fallback={<div className="h-[320px]" aria-hidden/>}><AuthForm/></Suspense></AuthShell>}
