'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { InvitationType, ResponseStatus, MenuType, FamilyMemberResponse } from '@/lib/types'

interface MemberResponse {
  guest_id: number
  name: string
  surname: string
  response_status: ResponseStatus
  dietary_requirements: string
}

function ConfirmAttendanceContent() {
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [surname, setSurname] = useState('')
  const [guest, setGuest] = useState<any>(null)
  const [familyMembers, setFamilyMembers] = useState<any[]>([])
  const [memberResponses, setMemberResponses] = useState<MemberResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  // Helper function to save guest code to cache (expires in 1 day)
  const saveGuestCodeToCache = (code: string) => {
    if (typeof window === 'undefined') return
    
    try {
      const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 1 day in milliseconds
      localStorage.setItem('guestConfirmationCode', JSON.stringify({
        code,
        expiresAt,
      }))
      // Dispatch custom event to notify Navigation component
      window.dispatchEvent(new Event('guestCodeSaved'))
    } catch (err) {
      console.error('Error saving guest code to cache:', err)
    }
  }

  // Check for ID parameter in URL on mount
  useEffect(() => {
    const idParam = searchParams.get('id')
    if (idParam) {
      // Save guest code to cache when accessed via QR code
      saveGuestCodeToCache(idParam)
      
      // Decode base64url ID (supports both old and new format)
      try {
        const decodeId = (encoded: string): number => {
          if (typeof window !== 'undefined' && typeof atob !== 'undefined') {
            try {
              // Decode base64url (reverse the encoding: - to +, _ to /, add padding if needed)
              let base64 = encoded
                .replace(/-/g, '+')
                .replace(/_/g, '/')
              
              // Add padding if needed
              while (base64.length % 4) {
                base64 += '='
              }
              
              const decoded = atob(base64)
              // Try to extract ID from the decoded string (format: "ID-secret-timestamp")
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
          // For SSR, try parsing directly
          return parseInt(encoded)
        }
        const guestId = decodeId(idParam)
        
        if (!isNaN(guestId) && guestId > 0) {
          // Automatically lookup guest when ID is provided in URL
          setTimeout(() => {
            lookupGuestById(guestId)
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
  }, [searchParams])

  const lookupGuestById = async (guestId: number) => {
    if (!guestId || isNaN(guestId)) {
      setError('ID ospite non valido')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/guests/confirm/${guestId}`)
      const data = await response.json()

      if (response.ok) {
        setGuest(data.guest)
        const members = data.familyMembers || [data.guest]
        setFamilyMembers(members)
        setSurname(data.guest.surname || '')
        
        // Initialize responses for each member
        const initialResponses: MemberResponse[] = members.map((member: any) => ({
          guest_id: member.id,
          name: member.name,
          surname: member.surname || '',
          response_status: member.response_status === 'pending' ? 'confirmed' : member.response_status,
          dietary_requirements: member.dietary_requirements || '',
        }))
        setMemberResponses(initialResponses)
      } else {
        setError(data.error || 'Ospite non trovato.')
        setGuest(null)
        setFamilyMembers([])
      }
    } catch (err) {
      setError('Si è verificato un errore. Riprova.')
      setGuest(null)
      setFamilyMembers([])
    } finally {
      setLoading(false)
    }
  }

  const lookupGuest = async () => {
    if (!name && !surname) {
      setError('Inserisci almeno il nome o il cognome')
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (name) params.append('name', name)
      if (surname) params.append('surname', surname)
      
      const response = await fetch(`/api/guests/search?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setGuest(data.guest)
        const members = data.familyMembers || [data.guest]
        setFamilyMembers(members)
        
        // Initialize responses for each member
        const initialResponses: MemberResponse[] = members.map((member: any) => ({
          guest_id: member.id,
          name: member.name,
          surname: member.surname || '',
          response_status: member.response_status === 'pending' ? 'confirmed' : member.response_status,
          dietary_requirements: member.dietary_requirements || '',
        }))
        setMemberResponses(initialResponses)
      } else {
        setError(data.error || 'Ospite non trovato. Controlla nome e cognome.')
        setGuest(null)
        setFamilyMembers([])
      }
    } catch (err) {
      setError('Si è verificato un errore. Riprova.')
      setGuest(null)
      setFamilyMembers([])
    } finally {
      setLoading(false)
    }
  }

  const updateMemberResponse = (index: number, field: keyof MemberResponse, value: any) => {
    const updated = [...memberResponses]
    updated[index] = { ...updated[index], [field]: value }
    setMemberResponses(updated)
  }

  const submitResponse = async () => {
    if (!guest || memberResponses.length === 0) return

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
        body: JSON.stringify({ responses }),
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

  const getUnifiedMessage = (type: InvitationType, isFamily: boolean) => {
    const time = type === 'full' ? '12' : '20'
    const familyPart = isFamily 
      ? " Vi chiediamo di confermare la presenza per tutti i membri della famiglia."
      : ""
    
    return `Siamo felici di avervi con noi in questo giorno speciale! Il ritrovo è alle ore ${time}.${familyPart}`
  }

  const hasConfirmedMembers = memberResponses.some(mr => mr.response_status === 'confirmed')

  if (submitted) {
    return (
      <div className="py-16 px-4 flex items-center justify-center">
        <div className="max-w-2xl mx-auto text-center bg-white/80 p-12 rounded-lg shadow-xl">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-serif text-wedding-gold mb-4">
            Grazie!
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            {hasConfirmedMembers
              ? "Siamo così felici di festeggiare con voi!"
              : "Ci dispiace che non possiate esserci, ma grazie per avercelo fatto sapere."}
          </p>
          <button
            onClick={() => {
              setSubmitted(false)
              setName('')
              setSurname('')
              setGuest(null)
              setFamilyMembers([])
              setMemberResponses([])
            }}
            className="bg-wedding-gold text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all"
          >
            Invia un'altra risposta
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-serif text-wedding-gold text-center mb-12">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold focus:border-transparent"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold focus:border-transparent"
                />
              </div>
            </div>
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
            )}
            <button
              onClick={lookupGuest}
              disabled={loading}
              className="w-full bg-wedding-gold text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="text-center mb-6">
              <p className="text-lg text-gray-700">
                {getUnifiedMessage(guest.invitation_type, familyMembers.length > 1)}
              </p>
            </div>

            {/* Form for each family member */}
            <div className="space-y-6">
              {memberResponses.map((memberResponse, index) => {
                const member = familyMembers[index]
                return (
                  <div key={member.id} className="border border-gray-200 rounded-lg p-6 space-y-4">
                    <h3 className="text-xl font-serif text-wedding-gold mb-4">
                      {member.name} {member.surname || ''}
                    </h3>

                    {/* Presence */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-3">
                        Parteciperà?
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name={`response-${member.id}`}
                            value="confirmed"
                            checked={memberResponse.response_status === 'confirmed'}
                            onChange={(e) => updateMemberResponse(index, 'response_status', e.target.value as ResponseStatus)}
                            className="mr-3"
                          />
                          <span>Sì, ci sarà! 🎉</span>
                        </label>
                        <label className="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name={`response-${member.id}`}
                            value="declined"
                            checked={memberResponse.response_status === 'declined'}
                            onChange={(e) => updateMemberResponse(index, 'response_status', e.target.value as ResponseStatus)}
                            className="mr-3"
                          />
                          <span>No, non ci sarà</span>
                        </label>
                      </div>
                    </div>

                    {/* Dietary requirements - only if confirmed */}
                    {memberResponse.response_status === 'confirmed' && (
                      <div>
                        <label className="block text-gray-700 font-medium mb-2">
                          Esigenze Alimentari (Opzionale)
                        </label>
                        <textarea
                          value={memberResponse.dietary_requirements}
                          onChange={(e) => updateMemberResponse(index, 'dietary_requirements', e.target.value)}
                          placeholder="Allergie o restrizioni alimentari?"
                          rows={2}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
            )}

            <button
              onClick={submitResponse}
              disabled={loading}
              className="w-full bg-wedding-gold text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
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
