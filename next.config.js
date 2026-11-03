/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Header noindex su tutte le risposte (pagine, immagini, PDF, API):
  // impedisce l'indicizzazione anche delle risorse che non hanno meta tag
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow, noimageindex' },
        ],
      },
    ]
  },
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
