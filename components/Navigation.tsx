'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getCachedGuestCode } from '@/lib/utils/guest-cache'

export default function Navigation() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [cachedGuestCode, setCachedGuestCode] = useState<string | null>(null)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Use hysteresis: hide when scrolling down past 50, show when scrolling up past 30
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // Scrolling down and past threshold - hide
        setScrolled(true)
      } else if (currentScrollY < lastScrollY && currentScrollY < 20) {
        // Scrolling up and below threshold - show
        setScrolled(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Check for cached guest code on mount and when pathname changes
  useEffect(() => {
    const code = getCachedGuestCode()
    setCachedGuestCode(code)
    
    // Listen for storage changes to update when guest code is saved
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'guestConfirmationCode') {
        const code = getCachedGuestCode()
        setCachedGuestCode(code)
      }
    }
    
    // Also listen for custom event for same-window updates
    const handleCustomStorageChange = () => {
      const code = getCachedGuestCode()
      setCachedGuestCode(code)
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('guestCodeSaved', handleCustomStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('guestCodeSaved', handleCustomStorageChange)
    }
  }, [pathname])

  const baseNavItems = [
    { href: '/', label: 'Benvenuto' },
    { href: '/us', label: 'Noi' },
    { href: '/gift-list', label: 'Lista Nozze' },
    { href: '/contacts', label: 'Contatti' },
  ]

  // Add "Conferma Presenza" only if guest code is cached
  const navItems = cachedGuestCode
    ? [
        ...baseNavItems.slice(0, 2),
        { href: `/confirm?id=${cachedGuestCode}`, label: 'Conferma Presenza' },
        ...baseNavItems.slice(2),
      ]
    : baseNavItems

  return (
    <nav className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
      {/* Mobile topbar - always visible with title + hamburger */}
      <div className="md:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h2 className="text-xl font-serif text-wedding-gold">
              Francesca & Antonio
            </h2>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-700 hover:text-wedding-gold transition-colors"
              aria-label="Menu"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: Top row with names - disappears on scroll */}
      <div
        className={`hidden md:block transition-all duration-300 overflow-hidden ${
          scrolled ? 'h-0 opacity-0' : 'h-12 opacity-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-12">
            <h2 className="text-2xl font-serif text-wedding-gold">
              Francesca & Antonio
            </h2>
          </div>
        </div>
      </div>

      {/* Desktop: Navigation menu - always visible */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16">
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors uppercase ${
                    isActive
                      ? 'text-wedding-gold border-b-2 border-wedding-gold'
                      : 'text-gray-700 hover:text-wedding-gold'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t shadow-lg">
          <div className="px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 text-base font-medium transition-colors uppercase rounded-lg ${
                    isActive
                      ? 'text-wedding-gold bg-wedding-gold/10'
                      : 'text-gray-700 hover:text-wedding-gold hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
