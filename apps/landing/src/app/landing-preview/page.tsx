import { HomeV2 } from '@/components/marketing/home-v2';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mesajify · Yeni landing önizlemesi',
  robots: { index: false, follow: false },
};

export default function LandingPreview() {
  return <HomeV2 />;
}
