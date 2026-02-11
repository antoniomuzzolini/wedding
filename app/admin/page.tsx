'use client'

import { useState, useEffect } from 'react'
import { Guest, InvitationType, MenuType } from '@/lib/types'

export default function AdminPanel() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set())
  const [editingGuest, setEditingGuest] = useState<number | null>(null)
  const [exportingPdf, setExportingPdf] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    invitation_type: 'full' as InvitationType,
    family_id: null as number | null,
    menu_type: 'adulto' as MenuType,
    response_status: 'pending' as 'pending' | 'confirmed' | 'declined',
  })
  
  // New guest form
  const [newGuest, setNewGuest] = useState({
    name: '',
    surname: '',
    invitation_type: 'full' as InvitationType,
    linkToGuest: null as number | null,
    menu_type: 'adulto' as MenuType,
  })

  useEffect(() => {
    // Check if already authenticated (in production, use proper session management)
    const stored = localStorage.getItem('adminAuthenticated')
    const storedKey = localStorage.getItem('adminKey')
    if (stored === 'true' && storedKey) {
      setAuthenticated(true)
      setAdminKey(storedKey) // Restore adminKey from localStorage
    }
  }, [])

  useEffect(() => {
    // Load guests when authenticated and adminKey is available
    if (authenticated && adminKey) {
      loadGuests()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, adminKey])

  const authenticate = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: adminKey }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setAuthenticated(true)
        localStorage.setItem('adminAuthenticated', 'true')
        localStorage.setItem('adminKey', adminKey) // Store adminKey for API calls
        // Dispatch event to update navigation
        window.dispatchEvent(new Event('adminAuthChanged'))
        loadGuests()
      } else {
        setError(data.error || 'Chiave admin non valida')
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const loadGuests = async () => {
    if (!adminKey) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError('')
    
    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setError('Timeout: la richiesta ha impiegato troppo tempo')
      setLoading(false)
    }, 10000) // 10 second timeout
    
    try {
      const response = await fetch(`/api/guests?adminKey=${adminKey}`)
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          setError(errorData.error || 'Caricamento ospiti fallito')
        } catch {
          setError(`Errore ${response.status}: ${errorText}`)
        }
        setLoading(false)
        return
      }
      
      const data = await response.json()
      setGuests(data.guests || [])
    } catch (err) {
      clearTimeout(timeoutId)
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  const addGuest = async () => {
    if (!newGuest.name || !newGuest.surname || !newGuest.invitation_type) {
      setError('Nome, cognome e tipo di invito sono obbligatori')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newGuest.name,
          surname: newGuest.surname,
          invitation_type: newGuest.invitation_type,
          family_id: newGuest.linkToGuest,
          menu_type: newGuest.menu_type,
          adminKey: adminKey,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setNewGuest({ name: '', surname: '', invitation_type: 'full', linkToGuest: null, menu_type: 'adulto' })
        loadGuests()
      } else {
        setError(data.error || 'Aggiunta ospite fallita')
      }
    } catch (err) {
      setError('Si è verificato un errore')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (guest: Guest) => {
    setEditingGuest(guest.id)
    setEditForm({
      name: guest.name,
      surname: guest.surname || '',
      invitation_type: guest.invitation_type,
      family_id: guest.family_id,
      menu_type: (guest.menu_type || 'adulto') as MenuType,
      response_status: guest.response_status || 'pending',
    })
  }

  const cancelEdit = () => {
    setEditingGuest(null)
    setEditForm({
      name: '',
      surname: '',
      invitation_type: 'full',
      family_id: null,
      menu_type: 'adulto',
      response_status: 'pending',
    })
  }

  const updateGuest = async (id: number) => {
    if (!editForm.name || !editForm.surname) {
      setError('Nome e cognome sono obbligatori')
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/guests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          adminKey: adminKey,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setEditingGuest(null)
        loadGuests()
      } else {
        setError(data.error || 'Aggiornamento ospite fallito')
      }
    } catch (err) {
      setError('Si è verificato un errore')
    } finally {
      setLoading(false)
    }
  }

  const deleteGuest = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo ospite?')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/guests/delete/${id}?adminKey=${adminKey}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadGuests()
      } else {
        const data = await response.json()
        setError(data.error || 'Eliminazione ospite fallita')
      }
    } catch (err) {
      setError('Si è verificato un errore')
    } finally {
      setLoading(false)
    }
  }

  const getGroupStatus = (groupGuests: Guest[]): { status: string; label: string; color: string } => {
    const confirmed = groupGuests.filter(g => g.response_status === 'confirmed').length
    const declined = groupGuests.filter(g => g.response_status === 'declined').length
    const pending = groupGuests.filter(g => g.response_status === 'pending').length
    const total = groupGuests.length

    if (pending > 0) {
      return { status: 'pending', label: 'In Attesa', color: 'bg-gray-100 text-gray-800' }
    }
    if (confirmed === total) {
      return { status: 'confirmed', label: 'Confermato', color: 'bg-green-100 text-green-800' }
    }
    if (declined === total) {
      return { status: 'declined', label: 'Rifiutato', color: 'bg-red-100 text-red-800' }
    }
    if (confirmed > 0 && declined > 0) {
      return { status: 'partial', label: 'Parziale', color: 'bg-yellow-100 text-yellow-800' }
    }
    return { status: 'pending', label: 'In Attesa', color: 'bg-gray-100 text-gray-800' }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800'
      case 'declined':
        return 'bg-red-100 text-red-800'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getInvitationTypeLabel = (type: InvitationType) => {
    return type === 'full' ? 'Cerimonia Completa' : 'Solo Serata'
  }

  const getInvitationTypeShort = (type: InvitationType) => {
    return type === 'full' ? 'CC' : 'SS'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confermato'
      case 'declined':
        return 'Rifiutato'
      default:
        return 'In Attesa'
    }
  }

  const getStatusShort = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'OK'
      case 'declined':
        return 'NO'
      default:
        return 'Attesa'
    }
  }

  const getMenuTypeShort = (menuType: MenuType) => {
    switch (menuType) {
      case 'adulto':
        return 'A'
      case 'bambino':
        return 'B'
      case 'neonato':
        return 'N'
      default:
        return '-'
    }
  }

  const exportParticipationsPDF = async () => {
    if (!adminKey) {
      setError('Chiave admin non disponibile')
      return
    }

    setExportingPdf(true)
    setError('')
    
    try {
      const response = await fetch(`/api/admin/export-participations?adminKey=${adminKey}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Errore durante l\'esportazione' }))
        setError(errorData.error || 'Errore durante l\'esportazione del PDF')
        setExportingPdf(false)
        return
      }

      // Get PDF blob
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `partecipazioni-${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      setError('Si è verificato un errore durante l\'esportazione: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setExportingPdf(false)
    }
  }

  const getGroupStatusShort = (groupGuests: Guest[]): { status: string; label: string; color: string } => {
    const confirmed = groupGuests.filter(g => g.response_status === 'confirmed').length
    const declined = groupGuests.filter(g => g.response_status === 'declined').length
    const pending = groupGuests.filter(g => g.response_status === 'pending').length
    const total = groupGuests.length

    if (pending > 0) {
      return { status: 'pending', label: 'Attesa', color: 'bg-gray-100 text-gray-800' }
    }
    if (confirmed === total) {
      return { status: 'confirmed', label: 'OK', color: 'bg-green-100 text-green-800' }
    }
    if (declined === total) {
      return { status: 'declined', label: 'NO', color: 'bg-red-100 text-red-800' }
    }
    if (confirmed > 0 && declined > 0) {
      return { status: 'partial', label: 'Parz.', color: 'bg-yellow-100 text-yellow-800' }
    }
    return { status: 'pending', label: 'Attesa', color: 'bg-gray-100 text-gray-800' }
  }

  // Group guests by family_id - include the main guest (the one with id === family_id)
  // Single guests are also treated as groups with just one member
  const groupedGuests = guests.reduce((acc, guest) => {
    if (guest.family_id) {
      // This guest is linked to another guest
      const key = guest.family_id
      if (!acc[key]) {
        acc[key] = []
        // Find and add the main guest (the one with id === family_id)
        const mainGuest = guests.find(g => g.id === guest.family_id)
        if (mainGuest && !acc[key].some(g => g.id === mainGuest.id)) {
          acc[key].push(mainGuest)
        }
      }
      // Add this guest if not already in the group
      if (!acc[key].some(g => g.id === guest.id)) {
        acc[key].push(guest)
      }
    } else {
      // Check if this guest is the main guest of any group (someone has family_id === this guest.id)
      const isMainGuest = guests.some(g => g.family_id === guest.id)
      if (isMainGuest) {
        // This guest is the main guest of a group, add it to that group
        const key = guest.id
        if (!acc[key]) {
          acc[key] = []
        }
        if (!acc[key].some(g => g.id === guest.id)) {
          acc[key].push(guest)
        }
      } else {
        // This is a single guest - treat it as a group with one member
        const key = guest.id
        acc[key] = [guest]
      }
    }
    return acc
  }, {} as Record<string | number, Guest[]>)

  const getFamilyMembers = (guest: Guest) => {
    if (!guest.family_id) return []
    const familyId = guest.family_id
    return guests.filter(g => 
      (g.family_id === familyId || g.id === familyId) && g.id !== guest.id
    )
  }

  const toggleGroup = (familyId: number) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(familyId)) {
      newExpanded.delete(familyId)
    } else {
      newExpanded.add(familyId)
    }
    setExpandedGroups(newExpanded)
  }

  // All guests are treated as groups (including single guests)
  const groups = Object.entries(groupedGuests)

  if (!authenticated) {
    return (
      <div className="py-16 px-4 flex items-center justify-center">
        <div className="max-w-md mx-auto bg-white/80 p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-serif text-wedding-sage-dark mb-6 text-center">
            Accesso Admin
          </h1>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Chiave Admin</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
            />
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
          <button
            onClick={authenticate}
            className="w-full bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90"
          >
            Accedi
          </button>
        </div>
      </div>
    )
  }

  const confirmedCount = guests.filter((g) => g.response_status === 'confirmed').length
  const declinedCount = guests.filter((g) => g.response_status === 'declined').length
  const pendingCount = guests.filter((g) => g.response_status === 'pending').length

  // Counts for full ceremony (intera cerimonia) - structured by menu type and status
  const fullCeremonyGuests = guests.filter((g) => g.invitation_type === 'full')
  
  // Adults counts
  const fullCeremonyAdultsInvited = fullCeremonyGuests.filter((g) => g.menu_type === 'adulto').length
  const fullCeremonyAdultsPending = fullCeremonyGuests.filter((g) => g.menu_type === 'adulto' && g.response_status === 'pending').length
  const fullCeremonyAdultsConfirmed = fullCeremonyGuests.filter((g) => g.menu_type === 'adulto' && g.response_status === 'confirmed').length
  const fullCeremonyAdultsDeclined = fullCeremonyGuests.filter((g) => g.menu_type === 'adulto' && g.response_status === 'declined').length
  
  // Children counts
  const fullCeremonyBambiniInvited = fullCeremonyGuests.filter((g) => g.menu_type === 'bambino').length
  const fullCeremonyBambiniPending = fullCeremonyGuests.filter((g) => g.menu_type === 'bambino' && g.response_status === 'pending').length
  const fullCeremonyBambiniConfirmed = fullCeremonyGuests.filter((g) => g.menu_type === 'bambino' && g.response_status === 'confirmed').length
  const fullCeremonyBambiniDeclined = fullCeremonyGuests.filter((g) => g.menu_type === 'bambino' && g.response_status === 'declined').length
  
  // Babies counts
  const fullCeremonyNeonatiInvited = fullCeremonyGuests.filter((g) => g.menu_type === 'neonato').length
  const fullCeremonyNeonatiPending = fullCeremonyGuests.filter((g) => g.menu_type === 'neonato' && g.response_status === 'pending').length
  const fullCeremonyNeonatiConfirmed = fullCeremonyGuests.filter((g) => g.menu_type === 'neonato' && g.response_status === 'confirmed').length
  const fullCeremonyNeonatiDeclined = fullCeremonyGuests.filter((g) => g.menu_type === 'neonato' && g.response_status === 'declined').length

  // Counts for evening only (sera) - total counts without age division
  const eveningGuests = guests.filter((g) => g.invitation_type === 'evening')
  const eveningInvited = eveningGuests.length
  const eveningPending = eveningGuests.filter((g) => g.response_status === 'pending').length
  const eveningConfirmed = eveningGuests.filter((g) => g.response_status === 'confirmed').length
  const eveningDeclined = eveningGuests.filter((g) => g.response_status === 'declined').length

  // Dietary requirements recap
  const dietaryRequirements = guests
    .filter((g) => g.dietary_requirements && g.dietary_requirements.trim() !== '')
    .map((g) => ({
      name: g.name,
      surname: g.surname || '',
      message: g.dietary_requirements || '',
      invitation_type: g.invitation_type,
      response_status: g.response_status,
    }))
    .sort((a, b) => {
      // Sort by surname, then name
      if (a.surname !== b.surname) {
        return (a.surname || '').localeCompare(b.surname || '')
      }
      return a.name.localeCompare(b.name)
    })

  // Check if form is valid for adding guest
  const canAddGuest = newGuest.name.trim() !== '' && newGuest.surname.trim() !== '' && newGuest.invitation_type && !loading && authenticated

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-5xl font-serif text-wedding-sage-dark">
            Gestione Ospiti
          </h1>
          <button
            onClick={exportParticipationsPDF}
            disabled={exportingPdf || guests.length === 0}
            className="bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all font-serif disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {exportingPdf ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Esportazione in corso...</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Esporta Partecipazioni PDF</span>
              </>
            )}
          </button>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-gray-800">{guests.length}</div>
            <div className="text-gray-600">Totale Ospiti</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-green-800">{confirmedCount}</div>
            <div className="text-gray-600">Confermati</div>
          </div>
          <div className="bg-red-50 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-red-800">{declinedCount}</div>
            <div className="text-gray-600">Rifiutati</div>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-gray-800">{pendingCount}</div>
            <div className="text-gray-600">In Attesa</div>
          </div>
        </div>

        {/* Counts by invitation type and menu type */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Full Ceremony Counts */}
          <div className="bg-white/80 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-serif text-wedding-sage-dark mb-4 text-center">
              Intera Cerimonia
            </h3>
            
            {/* Adults Section */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Adulti</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800">{fullCeremonyAdultsInvited}</div>
                  <div className="text-xs text-gray-600">Invitati</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-500">{fullCeremonyAdultsPending}</div>
                  <div className="text-xs text-gray-600">In Attesa</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-700">{fullCeremonyAdultsConfirmed}</div>
                  <div className="text-xs text-gray-600">Accettati</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-700">{fullCeremonyAdultsDeclined}</div>
                  <div className="text-xs text-gray-600">Rifiutati</div>
                </div>
              </div>
            </div>

            {/* Children Section */}
            <div className="mb-4 pb-4 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Bambini</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800">{fullCeremonyBambiniInvited}</div>
                  <div className="text-xs text-gray-600">Invitati</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-500">{fullCeremonyBambiniPending}</div>
                  <div className="text-xs text-gray-600">In Attesa</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-700">{fullCeremonyBambiniConfirmed}</div>
                  <div className="text-xs text-gray-600">Accettati</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-700">{fullCeremonyBambiniDeclined}</div>
                  <div className="text-xs text-gray-600">Rifiutati</div>
                </div>
              </div>
            </div>

            {/* Babies Section */}
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-700 mb-3">Neonati</h4>
              <div className="grid grid-cols-4 gap-2 text-sm">
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800">{fullCeremonyNeonatiInvited}</div>
                  <div className="text-xs text-gray-600">Invitati</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-500">{fullCeremonyNeonatiPending}</div>
                  <div className="text-xs text-gray-600">In Attesa</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-green-700">{fullCeremonyNeonatiConfirmed}</div>
                  <div className="text-xs text-gray-600">Accettati</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-red-700">{fullCeremonyNeonatiDeclined}</div>
                  <div className="text-xs text-gray-600">Rifiutati</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <div className="text-lg font-semibold text-gray-700">
                Totale: {fullCeremonyGuests.length}
              </div>
            </div>
          </div>

          {/* Evening Only Counts */}
          <div className="bg-white/80 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-serif text-wedding-sage-dark mb-4 text-center">
              Solo Serata
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">{eveningInvited}</div>
                <div className="text-sm text-gray-600">Invitati</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">{eveningPending}</div>
                <div className="text-sm text-gray-600">In Attesa</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-700">{eveningConfirmed}</div>
                <div className="text-sm text-gray-600">Accettati</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-700">{eveningDeclined}</div>
                <div className="text-sm text-gray-600">Rifiutati</div>
              </div>
            </div>
          </div>
        </div>

        {/* Dietary Requirements Recap */}
        {dietaryRequirements.length > 0 && (
          <div className="bg-white/80 p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">
              Recap Richieste Alimentari e Intolleranze
            </h2>
            <div className="space-y-4">
              {dietaryRequirements.map((req, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-semibold text-gray-800">
                        {req.name} {req.surname}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({req.invitation_type === 'full' ? 'Cerimonia Completa' : 'Solo Serata'})
                      </span>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        req.response_status === 'confirmed'
                          ? 'bg-green-100 text-green-800'
                          : req.response_status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {req.response_status === 'confirmed'
                        ? 'Confermato'
                        : req.response_status === 'declined'
                        ? 'Rifiutato'
                        : 'In Attesa'}
                    </span>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap">{req.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Guest Form */}
        <div className="bg-white/80 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">Aggiungi Nuovo Ospite</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Nome *"
                value={newGuest.name}
                onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
              />
              <input
                type="text"
                placeholder="Cognome *"
                value={newGuest.surname}
                onChange={(e) => setNewGuest({ ...newGuest, surname: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
              />
              <select
                value={newGuest.invitation_type}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, invitation_type: e.target.value as InvitationType })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
              >
                <option value="full">Cerimonia Completa</option>
                <option value="evening">Solo Serata</option>
              </select>
              <select
                value={newGuest.menu_type}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, menu_type: e.target.value as MenuType })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
              >
                <option value="adulto">Menù Adulto</option>
                <option value="bambino">Menù Bambino</option>
                <option value="neonato">Menù Neonato</option>
              </select>
              <button
                onClick={addGuest}
                disabled={!canAddGuest}
                className="bg-wedding-sage-dark text-white px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aggiungi Ospite
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <select
                value={newGuest.linkToGuest || ''}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, linkToGuest: e.target.value ? parseInt(e.target.value) : null })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
              >
                <option value="">Collega a un ospite esistente (opzionale)</option>
                {guests.map((guest) => (
                  <option key={guest.id} value={guest.id}>
                    {guest.name} {guest.surname || ''}
                  </option>
                ))}
              </select>
              {newGuest.linkToGuest && (
                <div className="text-sm text-gray-600 flex items-center">
                  Questo ospite sarà collegato a: {guests.find(g => g.id === newGuest.linkToGuest)?.name} {guests.find(g => g.id === newGuest.linkToGuest)?.surname}
                </div>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
        )}

        {/* Guests List */}
        <div className="bg-white/80 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">Lista Ospiti</h2>
          {loading ? (
            <div className="text-center py-8">Caricamento...</div>
          ) : guests.length === 0 ? (
            <div className="text-center py-8 text-gray-600">Nessun ospite ancora</div>
          ) : (
            <div className="space-y-2">
              {/* Groups (including single guests) */}
              {groups.map(([familyId, groupGuests]) => {
                // Use the guest ID as the key for single guests, or family_id for groups
                const groupKey = typeof familyId === 'string' ? parseInt(familyId) : familyId
                const isExpanded = expandedGroups.has(groupKey)
                const mainGuest = groupGuests[0]
                const otherMembers = groupGuests.slice(1)
                const groupStatus = getGroupStatus(groupGuests)
                
                // Generate confirmation URL with encoded guest ID (longer and more secure)
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
                  // For SSR, return as string (will be encoded properly on client)
                  return id.toString()
                }
                const guestIdEncoded = encodeId(mainGuest.id)
                
                return (
                  <div key={familyId} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Group Header - Clickable */}
                    <div className="bg-gray-50 hover:bg-gray-100 transition-colors p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div 
                          onClick={() => toggleGroup(groupKey)}
                          className="flex items-center gap-3 cursor-pointer flex-1"
                        >
                          <svg
                            className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M9 5l7 7-7 7" />
                          </svg>
                          <div>
                            <span className="font-semibold text-gray-800">
                              {mainGuest.name} {mainGuest.surname || ''}
                            </span>
                            {otherMembers.length > 0 && (
                              <span className="text-sm text-gray-600 ml-2">
                                + {otherMembers.length} {otherMembers.length === 1 ? 'altro' : 'altri'}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 rounded text-xs ${groupStatus.color}`}>
                            <span className="md:hidden">{getGroupStatusShort(groupGuests).label}</span>
                            <span className="hidden md:inline">{groupStatus.label}</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/admin/participation/${guestIdEncoded}`, '_blank')
                            }}
                            className="px-3 py-1 bg-wedding-sage-dark text-white rounded text-xs hover:bg-opacity-90 transition-all"
                          >
                            <span className="md:hidden">Part.</span>
                            <span className="hidden md:inline">Partecipazione</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Group Members - Expandable */}
                    {isExpanded && (
                      <div className="bg-white border-t">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">Nome</th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">Cognome</th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">
                                  <span className="md:hidden">Inv.</span>
                                  <span className="hidden md:inline">Invito</span>
                                </th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">Menù</th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">
                                  <span className="md:hidden">Coll.</span>
                                  <span className="hidden md:inline">Collegamento</span>
                                </th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">Stato</th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">
                                  <span className="md:hidden">Data</span>
                                  <span className="hidden md:inline">Data Risposta</span>
                                </th>
                                <th className="text-left py-2 px-2 md:px-4 text-xs md:text-sm font-medium text-gray-700">Azioni</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupGuests.map((guest) => (
                                editingGuest === guest.id ? (
                                  <tr key={guest.id} className="border-b bg-yellow-50">
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs md:text-sm"
                                      />
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <input
                                        type="text"
                                        value={editForm.surname}
                                        onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-xs md:text-sm"
                                      />
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <select
                                        value={editForm.invitation_type}
                                        onChange={(e) => setEditForm({ ...editForm, invitation_type: e.target.value as InvitationType })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm w-full"
                                      >
                                        <option value="full">Cerimonia Completa</option>
                                        <option value="evening">Solo Serata</option>
                                      </select>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <select
                                        value={editForm.menu_type}
                                        onChange={(e) => setEditForm({ ...editForm, menu_type: e.target.value as MenuType })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm w-full"
                                      >
                                        <option value="adulto">Adulto</option>
                                        <option value="bambino">Bambino</option>
                                        <option value="neonato">Neonato</option>
                                      </select>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <select
                                        value={editForm.family_id || ''}
                                        onChange={(e) => setEditForm({ ...editForm, family_id: e.target.value ? parseInt(e.target.value) : null })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm w-full"
                                      >
                                        <option value="">Nessun collegamento</option>
                                        {guests.filter(g => g.id !== guest.id).map((g) => (
                                          <option key={g.id} value={g.id}>
                                            {g.name} {g.surname || ''}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <select
                                        value={editForm.response_status}
                                        onChange={(e) => setEditForm({ ...editForm, response_status: e.target.value as 'pending' | 'confirmed' | 'declined' })}
                                        className="px-2 py-1 border border-gray-300 rounded text-xs md:text-sm w-full"
                                      >
                                        <option value="pending">In Attesa</option>
                                        <option value="confirmed">Confermato</option>
                                        <option value="declined">Rifiutato</option>
                                      </select>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                                      {guest.response_date
                                        ? new Date(guest.response_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                                        : '-'}
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <div className="flex gap-1 md:gap-2">
                                        <button
                                          onClick={() => updateGuest(guest.id)}
                                          disabled={loading}
                                          className="text-green-600 hover:text-green-800 text-xs md:text-sm disabled:opacity-50"
                                        >
                                          <span className="md:hidden">✓</span>
                                          <span className="hidden md:inline">Salva</span>
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="text-gray-600 hover:text-gray-800 text-xs md:text-sm"
                                        >
                                          <span className="md:hidden">✗</span>
                                          <span className="hidden md:inline">Annulla</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={guest.id} className="border-b hover:bg-gray-50">
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-base">{guest.name}</td>
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-base">{guest.surname || '-'}</td>
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                                      <span className="md:hidden">{getInvitationTypeShort(guest.invitation_type)}</span>
                                      <span className="hidden md:inline">{getInvitationTypeLabel(guest.invitation_type)}</span>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                                      <span className="md:hidden">{getMenuTypeShort(guest.menu_type || 'adulto')}</span>
                                      <span className="hidden md:inline">
                                        {guest.menu_type === 'adulto' ? 'Adulto' :
                                         guest.menu_type === 'bambino' ? 'Bambino' :
                                         guest.menu_type === 'neonato' ? 'Neonato' : '-'}
                                      </span>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                                      {guest.family_id ? (
                                        <span className="text-gray-600">
                                          <span className="md:hidden">
                                            {guests.find(g => g.id === guest.family_id)?.name?.charAt(0)}.{guests.find(g => g.id === guest.family_id)?.surname?.charAt(0) || ''}
                                          </span>
                                          <span className="hidden md:inline">
                                            {guests.find(g => g.id === guest.family_id)?.name} {guests.find(g => g.id === guest.family_id)?.surname || ''}
                                          </span>
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <span
                                        className={`px-1.5 md:px-2 py-0.5 md:py-1 rounded text-xs md:text-sm ${getStatusColor(
                                          guest.response_status
                                        )}`}
                                      >
                                        <span className="md:hidden">{getStatusShort(guest.response_status)}</span>
                                        <span className="hidden md:inline">{getStatusLabel(guest.response_status)}</span>
                                      </span>
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4 text-xs md:text-sm">
                                      {guest.response_date
                                        ? new Date(guest.response_date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })
                                        : '-'}
                                    </td>
                                    <td className="py-2 md:py-3 px-2 md:px-4">
                                      <div className="flex gap-1 md:gap-2">
                                        <button
                                          onClick={() => startEdit(guest)}
                                          className="text-blue-600 hover:text-blue-800 text-xs md:text-sm"
                                        >
                                          <span className="md:hidden">Mod.</span>
                                          <span className="hidden md:inline">Modifica</span>
                                        </button>
                                        <button
                                          onClick={() => deleteGuest(guest.id)}
                                          className="text-red-600 hover:text-red-800 text-xs md:text-sm"
                                        >
                                          <span className="md:hidden">Del.</span>
                                          <span className="hidden md:inline">Elimina</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                )
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
