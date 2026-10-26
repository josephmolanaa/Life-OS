/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    agentUpgrade: 'security',
  },
}

module.exports = nextConfig
