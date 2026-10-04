import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  ...(process.env.STUDIO_BUILD_ROOT ? { turbopack: { root: process.env.STUDIO_BUILD_ROOT } } : {}),
  transpilePackages: ['@wa/shared'],
  serverExternalPackages: ['sharp'],
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@img/sharp-libvips-darwin*/**',
      'node_modules/@img/sharp-libvips-win32*/**',
      'node_modules/@swc/core*/**',
      'node_modules/lottie-web/**',
    ],
  },
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
