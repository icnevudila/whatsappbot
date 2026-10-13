import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/canli-takip',
        destination: 'https://app.mesajify.com/canli-takip',
      },
      {
        source: '/canli-takip/:path*',
        destination: 'https://app.mesajify.com/canli-takip/:path*',
      },
      {
        source: '/api/canli-takip/:path*',
        destination: 'https://app.mesajify.com/api/canli-takip/:path*',
      },
    ]
  },
}

export default nextConfig
