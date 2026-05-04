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

  useEffect(() => {
    document.body.classList.add('participation-mode')
    return () => document.body.classList.remove('participation-mode')
  }, [])

  useEffect(() => {
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
    <div
      className="participation-root min-h-screen w-full relative overflow-hidden text-wedding-sage-dark"
      style={{
        backgroundImage: "url('/images/partecipazione_2.png')",
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#FAF8F3',
      }}
    >
      <div className="relative z-10 min-h-screen flex items-center justify-end px-12 py-8">
        <div className="w-full max-w-2xl flex flex-col items-end justify-start">
          <div className="w-full text-right space-y-6 flex-1 flex flex-col justify-center">
            <div className="space-y-0">
              <h1 className="text-7xl font-script leading-tight">
                {WEDDING_CONSTANTS.COUPLE_NAMES}
              </h1>
            </div>

            <div className="space-y-4 font-serif text-[1.6rem] leading-relaxed">
              <p>annunciano con gioia il loro matrimonio</p>
            </div>

            <div className="space-y-4 font-serif text-lg leading-relaxed">
              <p className="text-[2.625rem] font-script leading-tight">
                {WEDDING_CONSTANTS.WEDDING_DATE}
              </p>
            </div>

            <div className="mt-4 space-y-0 print-leading-single">
              <p className="text-4xl font-serif uppercase font-bold">
                {WEDDING_CONSTANTS.VENUE_NAME}
              </p>
              <p className="text-4xl font-serif">
                {WEDDING_CONSTANTS.VENUE_ADDRESS}
              </p>
            </div>

            <div className="pt-10 space-y-8">
              {guest.invitation_type === 'full' ? (
                <div className="text-[1.6rem] font-serif print-leading-single whitespace-pre-line">
                  <p>
                    {familyMembers.length > 1 
                      ? PARTICIPATION_MESSAGES.FULL_CEREMONY.MULTIPLE
                      : PARTICIPATION_MESSAGES.FULL_CEREMONY.SINGLE}
                  </p>
                  <p>{PARTICIPATION_MESSAGES.FULL_CEREMONY.FOLLOW_UP}</p>
                </div>
              ) : (
                <div className="text-[1.6rem] font-serif print-leading-single whitespace-pre-line">
                  <p>
                    {familyMembers.length > 1
                      ? PARTICIPATION_MESSAGES.EVENING.MULTIPLE
                      : PARTICIPATION_MESSAGES.EVENING.SINGLE}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-16 mt-auto flex-shrink-0 flex flex-col items-end">
            <p className="participation-qr-copy text-xl font-serif mb-1.5 italic text-right whitespace-pre-line leading-snug">
              {familyMembers.length > 1
                ? PARTICIPATION_MESSAGES.QR_CODE.MULTIPLE
                : PARTICIPATION_MESSAGES.QR_CODE.SINGLE}
            </p>
            {confirmationUrl && (
              <div className="bg-transparent p-1.5 shadow-none">
                <QRCode
                  value={confirmationUrl}
                  size={120}
                  level="M"
                  fgColor="#468b70"
                  bgColor="transparent"
                />
              </div>
            )}
            <p className="participation-qr-copy text-2xl font-serif mb-1.5 text-right whitespace-pre-line leading-snug">
              Francesca - 345 1285879<br />
              Antonio - 329 7089218
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
