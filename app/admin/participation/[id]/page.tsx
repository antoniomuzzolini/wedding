'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import QRCode from 'react-qr-code'
import { Guest } from '@/lib/types'
import { decodeGuestId, encodeGuestId, isValidGuestId } from '@/lib/utils/guest-id'
import { lookupGuestById } from '@/lib/utils/guest-lookup'
import { PARTICIPATION_MESSAGES, WEDDING_CONSTANTS } from '@/lib/utils/constants'
import './participation.css'

export default function ParticipationPage() {
  const params = useParams()
  const [guest, setGuest] = useState<Guest | null>(null)
  const [familyMembers, setFamilyMembers] = useState<Guest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isPdfExport, setIsPdfExport] = useState(false)

  useEffect(() => {
    // Check if this is a PDF export request
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      setIsPdfExport(urlParams.get('pdf-export') === 'true')
    }

    const loadGuest = async () => {
      try {
        const idParam = params.id as string
        if (!idParam) {
          setError('ID non valido')
          setLoading(false)
          return
        }

        const guestId = decodeGuestId(idParam)
        
        if (!isValidGuestId(guestId)) {
          setError('ID ospite non valido')
          setLoading(false)
          return
        }

        const { guest: fetchedGuest, familyMembers: fetchedMembers } = await lookupGuestById(guestId)
        setGuest(fetchedGuest)
        setFamilyMembers(fetchedMembers)
      } catch (err: any) {
        setError(err.message || 'Si è verificato un errore')
      } finally {
        setLoading(false)
      }
    }

    loadGuest()
  }, [params.id])

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
    ? `${window.location.origin}/confirm?id=${encodeGuestId(guest.id)}`
    : ''

  return (
    <div className={`${isPdfExport ? 'fixed inset-0' : 'min-h-screen'} bg-[#FAF8F3] relative overflow-hidden`}>
      {/* Background image wrapper - visible in print */}
      <div 
        className={`${isPdfExport ? 'absolute' : 'fixed'} inset-0 z-0 print:absolute`}
        style={{
          backgroundImage: "url('/images/background.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.5,
          pointerEvents: 'none',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
          colorAdjust: 'exact',
        }}
      />

      <div className={`relative z-20 flex items-center justify-center ${isPdfExport ? 'p-0 h-full w-full' : 'p-8 print:p-0 min-h-[80vh] print:min-h-screen pb-24 print:pb-0'}`}>
        <div className={`${isPdfExport ? 'w-full h-full flex flex-col items-center justify-center px-12 py-8' : 'max-w-2xl w-full mx-auto print:max-w-full print:w-full print:h-full print:flex print:flex-col print:items-center print:justify-center print:px-12 print:py-8'}`}>
          {/* Main content */}
          <div className="text-center space-y-6 print:space-y-3 print:flex-1 print:flex print:flex-col print:justify-center">
            {/* Couple names */}
            <div className="space-y-1 print:space-y-0">
              <h1 className="text-6xl print:text-6xl font-script text-wedding-sage-dark leading-tight">
                {WEDDING_CONSTANTS.COUPLE_NAMES}
              </h1>
            </div>

            {/* Event announcement */}
            <div className="space-y-3 print:space-y-2 text-wedding-sage-dark font-serif text-base print:text-lg leading-relaxed print:mt-3">
              <p>
                annunciano con gioia il loro matrimonio
              </p>
              
              <p className="text-4xl print:text-5xl font-script text-wedding-sage-dark">
                {WEDDING_CONSTANTS.WEDDING_DATE}
              </p>
            </div>
            
            <div className="mt-6 print:mt-4 space-y-1 print:space-y-0">
              <p className="text-xl print:text-2xl font-serif text-wedding-sage-dark uppercase">
                {WEDDING_CONSTANTS.VENUE_NAME}
              </p>
              <p className="text-xl print:text-2xl font-serif text-wedding-sage-dark">
                {WEDDING_CONSTANTS.VENUE_ADDRESS}
              </p>
            </div>

            {/* Time sections */}
            <div className="pt-4 print:pt-3 space-y-3 print:space-y-2">
              {guest.invitation_type === 'full' ? (
                <div className="text-base print:text-lg font-serif text-wedding-sage-dark">
                  <p>
                    {familyMembers.length > 1 
                      ? PARTICIPATION_MESSAGES.FULL_CEREMONY.MULTIPLE
                      : PARTICIPATION_MESSAGES.FULL_CEREMONY.SINGLE}
                  </p>
                  <p>
                    {PARTICIPATION_MESSAGES.FULL_CEREMONY.FOLLOW_UP}
                  </p>
                </div>
              ) : (
                <div className="text-base print:text-lg font-serif text-wedding-sage-dark">
                  <p>
                    {familyMembers.length > 1
                      ? PARTICIPATION_MESSAGES.EVENING.MULTIPLE
                      : PARTICIPATION_MESSAGES.EVENING.SINGLE}
                  </p>
                </div>
              )}
            </div>

            {/* Guest names list */}
            <div className="pt-4 print:pt-3 border-t border-wedding-sage-medium border-opacity-30 mt-6 print:mt-3">
              <div className="text-base print:text-lg text-wedding-sage-dark font-serif">
                {familyMembers.map((member, index) => (
                  <p key={member.id} className={index > 0 ? 'mt-1 print:mt-0' : ''}>
                    {member.name} {member.surname || ''}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* QR Code - bottom in print */}
          <div className="pt-8 print:pt-4 print:mt-auto print:flex-shrink-0 flex flex-col items-center">
            <p className="text-base print:text-lg text-wedding-sage-dark font-serif mb-4 print:mb-3 italic print:text-center">
              {familyMembers.length > 1
                ? PARTICIPATION_MESSAGES.QR_CODE.MULTIPLE
                : PARTICIPATION_MESSAGES.QR_CODE.SINGLE}
            </p>
            {confirmationUrl && (
              <div className={`bg-white ${isPdfExport ? 'p-3' : 'p-3 print:p-3'} shadow-sm print:shadow-none print:bg-transparent`}>
                <QRCode
                  value={confirmationUrl}
                  size={isPdfExport ? 120 : 120}
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
            className="bg-wedding-sage-dark text-white px-8 py-3 rounded-lg hover:bg-opacity-90 transition-all font-serif"
          >
            Stampa
          </button>
        </div>
      </div>

    </div>
  )
}
