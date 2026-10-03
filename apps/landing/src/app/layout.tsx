import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import '@/components/brand/mesajify-mark.css';
import { PerformanceAudit } from '@/components/performance-audit';
import { Navbar } from '@/components/navbar';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'Mesajify',
  icons: {
    icon: [
      { url: '/icon.png?v=mesajify2', sizes: '512x512', type: 'image/png' },
      { url: '/favicon.ico?v=mesajify2', sizes: '32x32' },
    ],
    apple: [
      { url: '/apple-icon.png?v=mesajify2', sizes: '512x512', type: 'image/png' },
    ],
  },
  description:
    'Ürününüzü, menünüzü veya hizmetinizi WhatsApp’tan duyurun. Hedef kitlenizi hazırlayın, mesajlarınızı gönderin ve gelen soruları tek panelden yanıtlayın.',
  alternates: {
    canonical: 'https://mesajify.com',
  },
  openGraph: {
    title: 'Mesajify',
    description:
      'Ürününüzü, menünüzü veya hizmetinizi WhatsApp’tan duyurun. Hedef kitlenizi hazırlayın, mesajlarınızı gönderin ve gelen soruları tek panelden yanıtlayın.',
    url: 'https://mesajify.com',
    siteName: 'Mesajify',
    images: [
      {
        url: 'https://mesajify.com/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mesajify',
    description:
      'Ürününüzü, menünüzü veya hizmetinizi WhatsApp’tan duyurun. Hedef kitlenizi hazırlayın, mesajlarınızı gönderin ve gelen soruları tek panelden yanıtlayın.',
    images: ['https://mesajify.com/og-image.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} bg-canvas text-ink antialiased selection:bg-brand-soft selection:text-brand`}
      >
        <PerformanceAudit />
        <Navbar />
        {children}
      </body>
    </html>
  );
}
