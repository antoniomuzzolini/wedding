/**
 * Utility functions for guest lookup and response initialization
 */

import { ResponseStatus } from '@/lib/types'

export interface MemberResponse {
  guest_id: number
  name: string
  surname: string
  response_status: ResponseStatus
  dietary_requirements: string
}

export interface GuestLookupResult {
  guest: any
  familyMembers: any[]
}

/**
 * Initializes member responses from family members data
 */
export function initializeMemberResponses(
  members: any[]
): MemberResponse[] {
  return members.map((member: any) => ({
    guest_id: member.id,
    name: member.name,
    surname: member.surname || '',
    response_status: member.response_status === 'pending' 
      ? 'confirmed' 
      : member.response_status,
    dietary_requirements: member.dietary_requirements || '',
  }))
}

/**
 * Looks up a guest by ID
 */
export async function lookupGuestById(
  guestId: number
): Promise<GuestLookupResult> {
  const response = await fetch(`/api/guests/confirm/${guestId}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Ospite non trovato.')
  }

  return {
    guest: data.guest,
    familyMembers: data.familyMembers || [data.guest],
  }
}

/**
 * Looks up a guest by name and surname
 */
export async function lookupGuestByName(
  name: string,
  surname: string
): Promise<GuestLookupResult> {
  const params = new URLSearchParams()
  if (name) params.append('name', name)
  if (surname) params.append('surname', surname)
  
  const response = await fetch(`/api/guests/search?${params.toString()}`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Ospite non trovato. Controlla nome e cognome.')
  }

  return {
    guest: data.guest,
    familyMembers: data.familyMembers || [data.guest],
  }
}
