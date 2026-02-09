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
  const [editForm, setEditForm] = useState({
    name: '',
    surname: '',
    invitation_type: 'full' as InvitationType,
    family_id: null as number | null,
    menu_type: 'adulto' as MenuType,
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
    if (stored === 'true') {
      setAuthenticated(true)
      loadGuests()
    }
  }, [])

  const authenticate = () => {
    // Simple auth check - REPLACE WITH PROPER AUTH IN PRODUCTION
    if (adminKey === 'admin123') {
      setAuthenticated(true)
      localStorage.setItem('adminAuthenticated', 'true')
      loadGuests()
    } else {
      setError('Chiave admin non valida')
    }
  }

  const loadGuests = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/guests?adminKey=${adminKey || 'admin123'}`)
      const data = await response.json()
      if (response.ok) {
        setGuests(data.guests)
      } else {
        setError(data.error || 'Caricamento ospiti fallito')
      }
    } catch (err) {
      setError('Si è verificato un errore')
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
          adminKey: adminKey || 'admin123',
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
          adminKey: adminKey || 'admin123',
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
      const response = await fetch(`/api/guests/delete/${id}?adminKey=${adminKey || 'admin123'}`, {
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
          <h1 className="text-3xl font-serif text-wedding-gold mb-6 text-center">
            Accesso Admin
          </h1>
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2">Chiave Admin</label>
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && authenticate()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold"
            />
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}
          <button
            onClick={authenticate}
            className="w-full bg-wedding-gold text-white px-6 py-3 rounded-lg hover:bg-opacity-90"
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

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-serif text-wedding-gold mb-8 text-center">
          Gestione Ospiti
        </h1>

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

        {/* Add Guest Form */}
        <div className="bg-white/80 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-serif text-wedding-gold mb-4">Aggiungi Nuovo Ospite</h2>
          <div className="space-y-4">
            <div className="grid md:grid-cols-5 gap-4">
              <input
                type="text"
                placeholder="Nome *"
                value={newGuest.name}
                onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold"
              />
              <input
                type="text"
                placeholder="Cognome *"
                value={newGuest.surname}
                onChange={(e) => setNewGuest({ ...newGuest, surname: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold"
              />
              <select
                value={newGuest.invitation_type}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, invitation_type: e.target.value as InvitationType })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold"
              >
                <option value="full">Cerimonia Completa</option>
                <option value="evening">Solo Serata</option>
              </select>
              <select
                value={newGuest.menu_type}
                onChange={(e) =>
                  setNewGuest({ ...newGuest, menu_type: e.target.value as MenuType })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold"
              >
                <option value="adulto">Menù Adulto</option>
                <option value="bambino">Menù Bambino</option>
                <option value="neonato">Menù Neonato</option>
              </select>
              <button
                onClick={addGuest}
                disabled={loading}
                className="bg-wedding-gold text-white px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
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
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold"
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
          <h2 className="text-2xl font-serif text-wedding-gold mb-4">Lista Ospiti</h2>
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
                
                // Generate confirmation URL with encoded guest ID (base64url - no special chars)
                const encodeId = (id: number): string => {
                  if (typeof window !== 'undefined' && typeof btoa !== 'undefined') {
                    // Use base64url encoding (replaces + with -, / with _, removes = padding)
                    const base64 = btoa(id.toString())
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
                            {groupStatus.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              window.open(`/admin/participation/${guestIdEncoded}`, '_blank')
                            }}
                            className="px-3 py-1 bg-wedding-gold text-white rounded text-xs hover:bg-opacity-90 transition-all"
                          >
                            Partecipazione
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
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Nome</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Cognome</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Invito</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Menù</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Collegamento</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Stato</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Data Risposta</th>
                                <th className="text-left py-2 px-4 text-sm font-medium text-gray-700">Azioni</th>
                              </tr>
                            </thead>
                            <tbody>
                              {groupGuests.map((guest) => (
                                editingGuest === guest.id ? (
                                  <tr key={guest.id} className="border-b bg-yellow-50">
                                    <td className="py-3 px-4">
                                      <input
                                        type="text"
                                        value={editForm.name}
                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      <input
                                        type="text"
                                        value={editForm.surname}
                                        onChange={(e) => setEditForm({ ...editForm, surname: e.target.value })}
                                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                      />
                                    </td>
                                    <td className="py-3 px-4">
                                      <select
                                        value={editForm.invitation_type}
                                        onChange={(e) => setEditForm({ ...editForm, invitation_type: e.target.value as InvitationType })}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="full">Cerimonia Completa</option>
                                        <option value="evening">Solo Serata</option>
                                      </select>
                                    </td>
                                    <td className="py-3 px-4">
                                      <select
                                        value={editForm.menu_type}
                                        onChange={(e) => setEditForm({ ...editForm, menu_type: e.target.value as MenuType })}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                                      >
                                        <option value="adulto">Adulto</option>
                                        <option value="bambino">Bambino</option>
                                        <option value="neonato">Neonato</option>
                                      </select>
                                    </td>
                                    <td className="py-3 px-4">
                                      <select
                                        value={editForm.family_id || ''}
                                        onChange={(e) => setEditForm({ ...editForm, family_id: e.target.value ? parseInt(e.target.value) : null })}
                                        className="px-2 py-1 border border-gray-300 rounded text-sm w-full"
                                      >
                                        <option value="">Nessun collegamento</option>
                                        {guests.filter(g => g.id !== guest.id).map((g) => (
                                          <option key={g.id} value={g.id}>
                                            {g.name} {g.surname || ''}
                                          </option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`px-2 py-1 rounded text-sm ${getStatusColor(
                                          guest.response_status
                                        )}`}
                                      >
                                        {guest.response_status === 'confirmed' ? 'Confermato' : 
                                         guest.response_status === 'declined' ? 'Rifiutato' : 
                                         'In Attesa'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                      {guest.response_date
                                        ? new Date(guest.response_date).toLocaleDateString('it-IT')
                                        : '-'}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => updateGuest(guest.id)}
                                          disabled={loading}
                                          className="text-green-600 hover:text-green-800 text-sm disabled:opacity-50"
                                        >
                                          Salva
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="text-gray-600 hover:text-gray-800 text-sm"
                                        >
                                          Annulla
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ) : (
                                  <tr key={guest.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4">{guest.name}</td>
                                    <td className="py-3 px-4">{guest.surname || '-'}</td>
                                    <td className="py-3 px-4">
                                      {getInvitationTypeLabel(guest.invitation_type)}
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                      {guest.menu_type === 'adulto' ? 'Adulto' :
                                       guest.menu_type === 'bambino' ? 'Bambino' :
                                       guest.menu_type === 'neonato' ? 'Neonato' : '-'}
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                      {guest.family_id ? (
                                        <span className="text-gray-600">
                                          {guests.find(g => g.id === guest.family_id)?.name} {guests.find(g => g.id === guest.family_id)?.surname || ''}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`px-2 py-1 rounded text-sm ${getStatusColor(
                                          guest.response_status
                                        )}`}
                                      >
                                        {guest.response_status === 'confirmed' ? 'Confermato' : 
                                         guest.response_status === 'declined' ? 'Rifiutato' : 
                                         'In Attesa'}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                      {guest.response_date
                                        ? new Date(guest.response_date).toLocaleDateString('it-IT')
                                        : '-'}
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => startEdit(guest)}
                                          className="text-blue-600 hover:text-blue-800 text-sm"
                                        >
                                          Modifica
                                        </button>
                                        <button
                                          onClick={() => deleteGuest(guest.id)}
                                          className="text-red-600 hover:text-red-800 text-sm"
                                        >
                                          Elimina
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
