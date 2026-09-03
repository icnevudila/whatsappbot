import { redirect } from 'next/navigation'

export default function Home() {
  // Middleware oturumu zaten kontrol ediyor; buraya gelen her istek yonlendirilir.
  redirect('/hesaplar')
}
