import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @wa/shared kaynak TypeScript olarak yayinlaniyor (derleme adimi yok),
  // bu yuzden Next'in onu transpile etmesi gerekiyor.
  transpilePackages: [
    '@wa/shared',
    '@capacitor/core',
    '@capacitor/app',
    '@capacitor/status-bar',
    '@capacitor/push-notifications',
  ],
}

export default nextConfig
