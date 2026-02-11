'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { MenuType, FamilyMemberResponse } from '@/lib/types'
import { decodeGuestId, isValidGuestId } from '@/lib/utils/guest-id'
import { saveGuestCodeToCache } from '@/lib/utils/guest-cache'
import { 
  lookupGuestById as fetchGuestById, 
  initializeMemberResponses,
  type MemberResponse 
} from '@/lib/utils/guest-lookup'
import SuccessMessage from '@/components/confirm/SuccessMessage'
import InvitationMessage from '@/components/confirm/InvitationMessage'
import MemberResponseForm from '@/components/confirm/MemberResponseForm'

function ConfirmAttendanceContent() {
  const searchParams = useSearchParams()
  const [guest, setGuest] = useState<any>(null)
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [memberResponses, setMemberResponses] = useState<MemberResponse[]>([])
  const [notificationEmail, setNotificationEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleLookupGuestById = async (guestId: number) => {
    if (!isValidGuestId(guestId)) {
      setError('ID ospite non valido')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { guest: fetchedGuest, familyMembers: fetchedMembers } = await fetchGuestById(guestId)
      setGuest(fetchedGuest)
      setFamilyMembers(fetchedMembers)
      setMemberResponses(initializeMemberResponses(fetchedMembers))
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore. Riprova.')
      setGuest(null)
      setFamilyMembers([])
    } finally {
      setLoading(false)
    }
  }

  // Check for ID parameter in URL on mount
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam) {
      // Save guest code to cache when accessed via QR code
      saveGuestCodeToCache(idParam)
      
      try {
        const guestId = decodeGuestId(idParam)
        
        if (isValidGuestId(guestId)) {
          // Automatically lookup guest when ID is provided in URL
          setTimeout(() => {
            handleLookupGuestById(guestId)
          }, 100)
        } else {
          setError('Link di conferma non valido')
        }
      } catch (err) {
        setError('Link di conferma non valido')
      }
    } else {
      // No ID parameter - show error since manual search is disabled
      setError('Link di conferma non valido. Utilizza il link fornito nell\'invito.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const updateMemberResponse = (index: number, field: keyof MemberResponse, value: any) => {
    const updated = [...memberResponses]
    updated[index] = { ...updated[index], [field]: value }
    setMemberResponses(updated)
  }

  const validateEmail = (email: string): boolean => {
    if (!email) return true // Email is optional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const submitResponse = async () => {
    if (!guest || memberResponses.length === 0) return

    // Validate email format if provided
    if (notificationEmail && !validateEmail(notificationEmail)) {
      setError('Formato email non valido')
      return
    }

    setLoading(true)
    setError('')

    try {
      const responses: FamilyMemberResponse[] = memberResponses.map(mr => ({
        guest_id: mr.guest_id,
        response_status: mr.response_status,
        menu_type: mr.response_status === 'confirmed' ? 'adulto' as MenuType : undefined,
        dietary_requirements: mr.response_status === 'confirmed' && mr.dietary_requirements ? mr.dietary_requirements : undefined,
      }))

      const response = await fetch('/api/guests/family/response', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          responses,
          notification_email: notificationEmail.trim() || undefined
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
      } else {
        setError(data.error || 'Invio della risposta fallito')
      }
    } catch (err) {
      setError('Si è verificato un errore. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const hasConfirmedMembers = memberResponses.some(mr => mr.response_status === 'confirmed')

  if (submitted) {
    return (
      <SuccessMessage 
        hasConfirmedMembers={hasConfirmedMembers}
        onEdit={() => setSubmitted(false)}
      />
    )
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif text-wedding-sage-dark text-center mb-12">
          Conferma la Tua Presenza
        </h1>

        {!guest ? (
          <div className="bg-white/80 p-8 rounded-lg shadow-lg">
            {/* Manual search disabled - only accessible via direct URL */}
            {/* 
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div>
                <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                  Nome
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && lookupGuest()}
                  placeholder="Inserisci il tuo nome"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="surname" className="block text-gray-700 font-medium mb-2">
                  Cognome
                </label>
                <input
                  id="surname"
                  type="text"
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && lookupGuest()}
                  placeholder="Inserisci il tuo cognome"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark focus:border-transparent"
                />
              </div>
            </div>
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
            )}
            <button
              onClick={lookupGuest}
              disabled={loading}
              className="w-full bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Ricerca in corso...' : 'Trova il Mio Invito'}
            </button>
            */}
            <div className="text-center py-8">
              <p className="text-lg text-gray-700 mb-4">
                Questa pagina è accessibile solo tramite il link fornito nell'invito.
              </p>
              {error && (
                <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
              )}
              {loading && (
                <div className="text-gray-600">Caricamento...</div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white/80 p-8 rounded-lg shadow-lg space-y-6">
            <InvitationMessage 
              invitationType={guest.invitation_type}
              familyMembersCount={familyMembers.length}
            />

            {/* Form for each family member */}
            <div className="space-y-6">
              {memberResponses.map((memberResponse, index) => {
                const member = familyMembers[index]
                return (
                  <MemberResponseForm
                    key={member.id}
                    member={member}
                    memberResponse={memberResponse}
                    index={index}
                    onUpdate={updateMemberResponse}
                  />
                )
              })}
            </div>

            {/* Notification Email Field */}
            <div className="border-t border-gray-200 pt-6">
              <label htmlFor="notification-email" className="block text-gray-700 font-medium mb-2">
                Email per Notifiche (Opzionale)
              </label>
              <p className="text-sm text-gray-600 mb-3">
                Inserisci un indirizzo email per ricevere notifiche su eventuali modifiche e quando verranno caricate le foto.
              </p>
              <input
                id="notification-email"
                type="email"
                value={notificationEmail}
                onChange={(e) => setNotificationEmail(e.target.value)}
                placeholder="esempio@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark focus:border-transparent"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
            )}

            <button
              onClick={submitResponse}
              disabled={loading}
              className="w-full bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
            >
              {loading ? 'Invio in corso...' : 'Invia Risposte'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ConfirmAttendance() {
  return (
    <Suspense fallback={
      <div className="py-16 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-gray-600">Caricamento...</div>
        </div>
      </div>
    }>
      <ConfirmAttendanceContent />
    </Suspense>
  )
}
