import type { Metadata, Viewport } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'The Puzzles Wedding - Matrimonio Francesca e Antonio',
    template: '%s | The Puzzles Wedding'
  },
  description: 'Unisciti a Francesca Poles e Antonio Muzzolini per celebrare il loro matrimonio il 13 Settembre 2026 a Villa Caiselli, Pavia di Udine. Conferma la tua presenza e scopri tutti i dettagli del nostro giorno speciale.',
  keywords: ['matrimonio', 'wedding', 'Francesca Poles', 'Antonio Muzzolini', 'Villa Caiselli', 'Pavia di Udine', '13 Settembre 2026', 'invito matrimonio', 'conferma presenza'],
  authors: [{ name: 'Francesca Poles e Antonio Muzzolini' }],
  creator: 'Francesca Poles e Antonio Muzzolini',
  publisher: 'Francesca Poles e Antonio Muzzolini',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'The Puzzles Wedding',
  },
  openGraph: {
    type: 'website',
    locale: 'it_IT',
    url: siteUrl,
    siteName: 'The Puzzles Wedding',
    title: 'The Puzzles Wedding - Matrimonio Francesca e Antonio',
    description: 'Unisciti a noi per celebrare il nostro giorno speciale il 13 Settembre 2026 a Villa Caiselli, Pavia di Udine',
    images: [
      {
        url: '/images/welcome.jpg',
        width: 1200,
        height: 630,
        alt: 'Francesca e Antonio - Il nostro matrimonio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Puzzles Wedding - Matrimonio Francesca e Antonio',
    description: 'Unisciti a noi per celebrare il nostro giorno speciale il 13 Settembre 2026',
    images: ['/images/welcome.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
}

export const viewport: Viewport = {
  themeColor: '#7A9C96',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
  
  // Structured Data for Wedding Event
  const weddingStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Matrimonio Francesca Poles e Antonio Muzzolini',
    description: 'Unisciti a noi per celebrare il nostro giorno speciale',
    startDate: '2026-09-13T12:00:00+02:00',
    endDate: '2026-09-13T23:59:59+02:00',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: 'Villa Caiselli',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Via della Ferrovia 8',
        addressLocality: 'Pavia di Udine',
        addressRegion: 'UD',
        addressCountry: 'IT',
      },
    },
    organizer: {
      '@type': 'Person',
      name: 'Francesca Poles e Antonio Muzzolini',
    },
    image: `${siteUrl}/images/welcome.jpg`,
  }

  const organizationStructuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'The Puzzles Wedding',
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
  }

  return (
    <html lang="it" className={`h-full ${playfairDisplay.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(weddingStructuredData) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationStructuredData) }}
        />
      </head>
      <body className="min-h-screen flex flex-col relative font-playfair">
        {/* Background image wrapper */}
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/images/background.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
        <Navigation />
        <main className="flex-grow relative z-10">{children}</main>
      </body>
    </html>
  )
}
