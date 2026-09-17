import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@wa/shared'],
  agentRules: false,
  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
    // Next 16: bodySizeLimit yalnızca experimental.serverActions altında okunuyor
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async redirects() {
    return [
      { source: '/hesaplar', destination: '/ayarlar/hatlar', permanent: false },
      { source: '/kara-liste', destination: '/ayarlar/engellenenler', permanent: false },
    ]
  },
}

export default nextConfig
