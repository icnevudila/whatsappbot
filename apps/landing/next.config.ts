import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/canli-takip',
        destination: 'https://app.mesajify.com/canli-takip',
        permanent: false,
      },
      {
        source: '/canli-takip/:path*',
        destination: 'https://app.mesajify.com/canli-takip/:path*',
        permanent: false,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/api/canli-takip/:path*',
        destination: 'https://app.mesajify.com/api/canli-takip/:path*',
      },
    ]
  },
}

export default nextConfig
