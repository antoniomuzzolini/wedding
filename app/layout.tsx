import type { Metadata } from 'next'
import { Playfair_Display } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: 'Il Nostro Matrimonio',
  description: 'Unisciti a noi per celebrare il nostro giorno speciale',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it" className={`h-full ${playfairDisplay.variable}`}>
      <body className="min-h-screen flex flex-col relative font-playfair">
        {/* Background image wrapper */}
        <div 
          className="fixed inset-0 z-0"
          style={{
            backgroundImage: "url('/images/background.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            transform: 'rotate(90deg)',
            transformOrigin: 'center center',
            width: '100vh',
            height: '100vw',
            top: '50%',
            left: '50%',
            marginTop: '-50vw',
            marginLeft: '-50vh',
            opacity: 0.25,
            pointerEvents: 'none',
          }}
        />
        <Navigation />
        <main className="flex-grow relative z-10">{children}</main>
      </body>
    </html>
  )
}
