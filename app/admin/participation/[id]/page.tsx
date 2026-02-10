'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { Guest } from '@/lib/types'
import './participation.css'

export default function ParticipationPage() {
  const params = useParams()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [familyMembers, setFamilyMembers] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadGuest = async () => {
      try {
        const idParam = params.id as string
        if (!idParam) {
          setError('ID non valido')
          setLoading(false)
          return
        }

        // Decode base64url ID (supports both old and new format)
        const decodeId = (encoded: string): number => {
          if (typeof window !== 'undefined' && typeof atob !== 'undefined') {
            try {
              let base64 = encoded
                .replace(/-/g, '+')
                .replace(/_/g, '/')
              
              while (base64.length % 4) {
                base64 += '='
              }
              
              const decoded = atob(base64)
              // Try to extract ID from the decoded string (format: "ID-secret-padding")
              const match = decoded.match(/^(\d+)-/)
              if (match) {
                return parseInt(match[1])
              }
              // Fallback: try parsing the whole decoded string as number (backward compatibility)
              return parseInt(decoded)
            } catch {
              // If it fails, try parsing directly (for backward compatibility with old short URLs)
              return parseInt(encoded)
            }
          }
          return parseInt(encoded)
        }

        const guestId = decodeId(idParam)
        
        if (isNaN(guestId) || guestId <= 0) {
          setError('ID ospite non valido')
          setLoading(false)
          return
        }

        const response = await fetch(`/api/guests/confirm/${guestId}`)
        const data = await response.json()

        if (response.ok) {
          setGuest(data.guest)
          setFamilyMembers(data.familyMembers || [data.guest])
        } else {
          setError(data.error || 'Ospite non trovato')
        }
      } catch (err) {
        setError('Si è verificato un errore')
      } finally {
        setLoading(false)
      }
    }

    loadGuest()
  }, [params.id])

  const encodeId = (id: number): string => {
    if (typeof window !== 'undefined' && typeof btoa !== 'undefined') {
      // Create a longer, more secure token by combining ID with a secret salt
      // This makes URLs longer and harder to guess
      // Format: "ID-secret-padding" where padding makes it consistently long
      const secret = 'wedding2026' // Simple secret for encoding
      const padding = String(id).padStart(6, '0').split('').reverse().join('') // Create padding from ID
      const combined = `${id}-${secret}-${padding}`
      const base64 = btoa(combined)
      // Use base64url encoding (replaces + with -, / with _, removes = padding)
      return base64
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
    }
    return id.toString()
  }

  const getInvitationTypeLabel = (type: string) => {
    return type === 'full' ? 'Cerimonia Completa' : 'Solo Serata'
  }

  const getTime = (type: string) => {
    return type === 'full' ? '12' : '20'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-2xl text-gray-600">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (error || !guest) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="text-2xl text-red-600">{error || 'Ospite non trovato'}</div>
        </div>
      </div>
    )
  }

  const confirmationUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/confirm?id=${encodeId(guest.id)}`
    : ''

  return (
    <div className="min-h-screen bg-[#FAF8F3] relative overflow-hidden">
      {/* Background image wrapper - visible in print */}
      <div 
        className="fixed inset-0 z-0 print:absolute"
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
          opacity: 0.35,
          pointerEvents: 'none',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          colorAdjust: 'exact',
        }}
      />

      <div className="relative z-20 flex items-center justify-center p-8 print:p-0 min-h-[80vh] print:min-h-screen pb-24 print:pb-0">
        <div className="max-w-2xl w-full mx-auto print:max-w-full print:w-full print:h-full print:flex print:flex-col print:items-center print:justify-center print:px-12 print:py-8">
          {/* Main content */}
          <div className="text-center space-y-6 print:space-y-3 print:flex-1 print:flex print:flex-col print:justify-center">
            {/* Opening phrase */}
            <p className="text-wedding-sage-dark text-sm print:text-base font-serif tracking-wide print:mb-2">
              Con infinita gioia
            </p>

            {/* Couple names */}
            <div className="space-y-1 print:space-y-0">
              <h1 className="text-6xl print:text-6xl font-script text-wedding-gold leading-tight">
                Francesca
              </h1>
              <p className="text-3xl print:text-3xl font-script text-wedding-gold -mt-2 print:-mt-1">
                e
              </p>
              <h1 className="text-6xl print:text-6xl font-script text-wedding-gold leading-tight -mt-2 print:-mt-1">
                Antonio
              </h1>
            </div>

            {/* Event announcement */}
            <div className="space-y-2 print:space-y-1 text-wedding-sage-dark font-serif text-base print:text-lg leading-relaxed print:mt-3">
              <p>
                annunciano il loro matrimonio
                {guest.invitation_type === 'full' 
                  ? ' che verrà celebrato presso la'
                  : ' e vi invitano alla festa serale presso'}
              </p>
              
              <p className="text-lg print:text-xl font-semibold uppercase tracking-wide text-wedding-gold print:mt-1">
                Villa Caiselli
              </p>
              
              <p className="text-sm print:text-base print:mt-0">
                Via della Ferrovia, 8 - Pavia di Udine
              </p>
            </div>

            {/* Date */}
            <div className="pt-3 print:pt-2 print:mt-2">
              <p className="text-4xl print:text-5xl font-script text-wedding-gold">
                Domenica 13 Settembre 2026
              </p>
              <p className="text-base print:text-lg text-wedding-sage-dark font-serif mt-1 print:mt-0">
                alle ore {getTime(guest.invitation_type)}
              </p>
            </div>

            {/* Guest name (subtle) */}
            <div className="pt-4 print:pt-2 border-t border-wedding-sage-medium border-opacity-30 mt-6 print:mt-3">
              <p className="text-sm print:text-sm text-wedding-sage-dark font-serif italic">
                {familyMembers.length > 1 ? 'Famiglia' : ''} {guest.name} {guest.surname || ''}
              </p>
            </div>
          </div>

          {/* QR Code - bottom in print */}
          <div className="pt-8 print:pt-4 print:mt-auto print:flex-shrink-0 flex flex-col items-center">
            <p className="text-xs print:text-sm text-wedding-sage-dark font-serif mb-4 print:mb-3 italic print:text-center">
              Scansiona il qr code oppure contattaci per confermare la tua presenza
            </p>
            {confirmationUrl && (
              <div className="bg-white p-3 print:p-3 shadow-sm print:shadow-none print:bg-transparent">
                <QRCode
                  value={confirmationUrl}
                  size={120}
                  level="M"
                  fgColor="#7A9C96"
                  bgColor="transparent"
                />
              </div>
            )}
          </div>
        </div>

        {/* Print button (hidden when printing) */}
        <div className="mt-12 print:hidden text-center absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => window.print()}
            className="bg-wedding-gold text-white px-8 py-3 rounded-lg hover:bg-opacity-90 transition-all font-serif"
          >
            Stampa
          </button>
        </div>
      </div>

    </div>
  )
}
