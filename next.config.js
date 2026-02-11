/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: [
    'puppeteer-core',
    '@sparticuz/chromium',
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude chromium packages from bundling
      config.externals = config.externals || []
      config.externals.push({
        'puppeteer-core': 'commonjs puppeteer-core',
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
      })
    }
    return config
  },
  // Turbopack configuration (empty to silence warning)
  turbopack: {},
}

module.exports = nextConfig
