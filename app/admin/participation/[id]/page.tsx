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

  useEffect(() => {
    if (typeof document === 'undefined') return
    if (isPdfExport) {
      document.body.classList.add('pdf-export')
      return () => document.body.classList.remove('pdf-export')
    }
    document.body.classList.remove('pdf-export')
    return undefined
  }, [isPdfExport])

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
    <div className={`${isPdfExport ? 'fixed inset-0' : 'min-h-screen'} participation-root bg-[#FAF8F3] relative overflow-hidden text-wedding-sage-dark`}>
      {/* Background image wrapper - visible in print */}
      <div 
        className={`participation-bg ${isPdfExport ? 'absolute' : 'fixed'} inset-0 z-0 print:absolute`}
      />

      {/* Print-safe background (doesn't rely on browser "print backgrounds") */}
      <img
        className="hidden print:block absolute inset-0 z-0 w-full h-full object-contain"
        src="/images/partecipazione_2.png"
        alt=""
        aria-hidden="true"
      />

      <div className={`participation-print-shell relative z-20 flex items-center justify-center ${isPdfExport ? 'p-0 h-full w-full' : 'p-8 print:p-0 min-h-[80vh] print:min-h-screen pb-24 print:pb-0'}`}>
        <div className={`participation-print-inner ${isPdfExport ? 'w-full h-full flex flex-col items-center justify-start px-12 py-8' : 'max-w-2xl w-full mx-auto print:max-w-full print:w-full print:h-full print:flex print:flex-col print:items-center print:justify-start print:px-12 print:py-8'}`}>
          {/* Main content */}
          <div className="participation-print-stack text-center space-y-6 print:space-y-8 print:flex-1 print:flex print:flex-col print:justify-center">
            {/* Couple names */}
            <div className="space-y-1 print:space-y-0">
              <h1 className="text-6xl print:text-7xl font-script leading-tight">
                {WEDDING_CONSTANTS.COUPLE_NAMES}
              </h1>
            </div>

            <div className="space-y-3 print:space-y-4 font-serif text-base print:text-[1.6rem] leading-relaxed">
              <p>
                annunciano con gioia il loro matrimonio
              </p>
            </div>
              
            <div className="space-y-3 print:space-y-4 font-serif text-base print:text-lg leading-relaxed">
              <p className="text-[2.625rem] print:text-[2.625rem] font-script leading-tight">
                {WEDDING_CONSTANTS.WEDDING_DATE}
              </p>
            </div>
            
            <div className="mt-6 print:mt-4 space-y-2 print:space-y-0 print-leading-single">
              <p className="text-xl print:text-4xl font-serif uppercase font-bold">
                {WEDDING_CONSTANTS.VENUE_NAME}
              </p>
              <p className="text-xl print:text-4xl font-serif">
                {WEDDING_CONSTANTS.VENUE_ADDRESS}
              </p>
            </div>

            {/* Time sections */}
            <div className="pt-10 print:pt-14 space-y-4 print:space-y-8">
              {guest.invitation_type === 'full' ? (
                <div className="text-base print:text-[1.6rem] font-serif print-leading-single whitespace-pre-line">
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
                <div className="text-base print:text-[1.6rem] font-serif print-leading-single whitespace-pre-line">
                  <p>
                    {familyMembers.length > 1
                      ? PARTICIPATION_MESSAGES.EVENING.MULTIPLE
                      : PARTICIPATION_MESSAGES.EVENING.SINGLE}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code - bottom in print */}
          <div className="participation-print-qr pt-8 print:pt-20 print:mt-auto print:flex-shrink-0 flex flex-col items-center">
            <p className="participation-qr-copy text-base print:text-xl font-serif mb-3 print:mb-1.5 italic print:text-right whitespace-pre-line leading-snug">
              {familyMembers.length > 1
                ? PARTICIPATION_MESSAGES.QR_CODE.MULTIPLE
                : PARTICIPATION_MESSAGES.QR_CODE.SINGLE}
            </p>
            {confirmationUrl && (
              <div className={`bg-white ${isPdfExport ? 'p-2' : 'p-3 print:p-1.5'} shadow-sm print:shadow-none print:bg-transparent`}>
                <QRCode
                  value={confirmationUrl}
                  size={isPdfExport ? 120 : 120}
                  level="M"
                  fgColor="#468b70"
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
