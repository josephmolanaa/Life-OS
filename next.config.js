/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
