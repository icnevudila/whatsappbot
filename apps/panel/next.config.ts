import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // @wa/shared kaynak TypeScript olarak yayinlaniyor (derleme adimi yok),
  // bu yuzden Next'in onu transpile etmesi gerekiyor.
  transpilePackages: ['@wa/shared'],
}

export default nextConfig
