import type { Metadata, Viewport } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';
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
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'Mesajify — AI Reklam ve WhatsApp Kampanya Platformu',
  description:
    'Reklam içeriğinizi oluşturun, WhatsApp kampanyalarınızı yönetin ve müşteri yanıtlarını tek panelde takip edin.',
  alternates: {
    canonical: 'https://mesajify.com',
  },
  openGraph: {
    title: 'Mesajify — AI Reklam ve WhatsApp Kampanya Platformu',
    description:
      'Reklam içeriğinizi oluşturun, WhatsApp kampanyalarınızı yönetin ve müşteri yanıtlarını tek panelde takip edin.',
    url: 'https://mesajify.com',
    siteName: 'Mesajify',
    images: [
      {
        url: 'https://mesajify.com/og-image.jpg',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mesajify — AI Reklam ve WhatsApp Kampanya Platformu',
    description:
      'Reklam içeriğinizi oluşturun, WhatsApp kampanyalarınızı yönetin ve müşteri yanıtlarını tek panelde takip edin.',
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
        <Navbar />
        {children}
      </body>
    </html>
  );
}
