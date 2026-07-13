'use client'

import { useState, useEffect, useCallback } from 'react'
import { Guest, WeddingTable, Tag, GuestTag } from '@/lib/types'

interface FamilyGroup {
  key: number
  label: string
  members: Guest[]        // membri idonei (cerimonia completa + confermati)
  unassigned: Guest[]     // membri idonei senza tavolo
  tagIds: Set<number>
  assignedTableId: number | null // tavolo dove siedono i membri già assegnati (se presente)
}

interface Proposal {
  assignments: { guest_id: number; table_id: number }[]
  unplacedFamilies: { memberIds: number[]; size: number }[]
}

interface LayoutSuggestion {
  tables: { name: string; capacity: number; guestIds: number[] }[]
  unplacedFamilies: { memberIds: number[]; size: number }[]
}

const TAG_COLORS = ['#7c9070', '#b0805b', '#7d8bae', '#a97d9c', '#c2a24b', '#6fa3a0', '#a86b6b', '#8a8a8a']

// Pannello di modifica tag per un gruppo di ospiti: di default i chip
// agiscono su tutti i membri, con la modalità "per singolo membro" per i
// casi in cui servono tag diversi dentro la stessa famiglia
function TagPanel({
  members,
  tags,
  tagsByGuestId,
  saving,
  onToggle,
}: {
  members: Guest[]
  tags: Tag[]
  tagsByGuestId: Map<number, number[]>
  saving: boolean
  onToggle: (memberIds: number[], tagId: number, action: 'add' | 'remove') => void
}) {
  const [perMember, setPerMember] = useState(false)
  const hasTag = (guestId: number, tagId: number) => (tagsByGuestId.get(guestId) || []).includes(tagId)

  if (tags.length === 0) {
    return (
      <div className="p-2 bg-gray-50 rounded text-xs text-gray-500">
        Crea prima un tag dalla sezione Tag
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded">
      {perMember && members.length > 1 ? (
        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs text-gray-700">{`${m.name} ${m.surname || ''}`.trim()}</span>
              <span className="flex flex-wrap gap-1">
                {tags.map((tag) => {
                  const active = hasTag(m.id, tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => onToggle([m.id], tag.id, active ? 'remove' : 'add')}
                      disabled={saving}
                      className={`px-2 py-0.5 rounded-full text-[10px] border transition-all ${active ? 'text-white' : 'text-gray-600 bg-white'}`}
                      style={active ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color }}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => {
            const withTag = members.filter((m) => hasTag(m.id, tag.id)).length
            const all = withTag === members.length && members.length > 0
            const partial = withTag > 0 && !all
            return (
              <button
                key={tag.id}
                onClick={() => onToggle(members.map((m) => m.id), tag.id, all ? 'remove' : 'add')}
                disabled={saving}
                className={`px-2 py-0.5 rounded-full text-xs border transition-all ${all ? 'text-white' : 'bg-white'}`}
                style={all ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color, color: partial ? tag.color : '#4b5563' }}
                title={partial ? `${withTag} membri su ${members.length} hanno questo tag; clicca per darlo a tutti` : undefined}
              >
                {tag.name}
                {partial && <span className="ml-1 font-semibold">{withTag}/{members.length}</span>}
              </button>
            )
          })}
        </div>
      )}
      {members.length > 1 && (
        <button
          onClick={() => setPerMember(!perMember)}
          className="self-start text-[10px] text-gray-500 underline hover:text-gray-700"
        >
          {perMember ? 'torna alla famiglia intera' : 'gestisci per singolo membro'}
        </button>
      )}
    </div>
  )
}

export default function TablesPage() {
  const [guests, setGuests] = useState<Guest[]>([])
  const [tables, setTables] = useState<WeddingTable[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [guestTags, setGuestTags] = useState<GuestTag[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [authenticated, setAuthenticated] = useState(false)

  const [newTable, setNewTable] = useState({ name: '', capacity: 10 })
  const [newTag, setNewTag] = useState({ name: '', color: TAG_COLORS[0] })
  const [editingTable, setEditingTable] = useState<number | null>(null)
  const [editTableForm, setEditTableForm] = useState({ name: '', capacity: 10 })
  const [taggingFamily, setTaggingFamily] = useState<number | null>(null)
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [includePending, setIncludePending] = useState(false)
  const [layoutSeats, setLayoutSeats] = useState({ min: 8, max: 10 })
  const [layout, setLayout] = useState<LayoutSuggestion | null>(null)
  const [splitFamily, setSplitFamily] = useState<number | null>(null)
  const [splitTableFamily, setSplitTableFamily] = useState<string | null>(null)
  const [tagTableFamily, setTagTableFamily] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('adminAuthenticated')
    const storedKey = localStorage.getItem('adminKey')
    if (stored === 'true' && storedKey) {
      setAuthenticated(true)
      setAdminKey(storedKey)
    }
  }, [])

  const loadData = useCallback(async () => {
    if (!adminKey) return
    setLoading(true)
    setError('')
    try {
      const [guestsRes, tablesRes, tagsRes] = await Promise.all([
        fetch(`/api/guests?adminKey=${adminKey}`),
        fetch(`/api/tables?adminKey=${adminKey}`),
        fetch(`/api/tags?adminKey=${adminKey}`),
      ])
      if (!guestsRes.ok || !tablesRes.ok || !tagsRes.ok) {
        setError('Errore nel caricamento dei dati')
        return
      }
      const guestsData = await guestsRes.json()
      const tablesData = await tablesRes.json()
      const tagsData = await tagsRes.json()
      setGuests(guestsData.guests || [])
      setTables(tablesData.tables || [])
      setTags(tagsData.tags || [])
      setGuestTags(tagsData.guest_tags || [])
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }, [adminKey])

  useEffect(() => {
    if (authenticated && adminKey) {
      loadData()
    }
  }, [authenticated, adminKey, loadData])

  const authenticate = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminKey }),
      })
      const data = await response.json()
      if (response.ok && data.success) {
        setAuthenticated(true)
        localStorage.setItem('adminAuthenticated', 'true')
        localStorage.setItem('adminKey', adminKey)
        window.dispatchEvent(new Event('adminAuthChanged'))
      } else {
        setError(data.error || 'Chiave admin non valida')
      }
    } catch {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // ---- Derived data ----

  const tagsByGuestId = guestTags.reduce((acc, gt) => {
    const list = acc.get(gt.guest_id) || []
    list.push(gt.tag_id)
    acc.set(gt.guest_id, list)
    return acc
  }, new Map<number, number[]>())

  const tagById = new Map(tags.map((t) => [t.id, t]))
  const tableById = new Map(tables.map((t) => [t.id, t]))

  // Ai tavoli siedono i confermati a cerimonia completa; i pending solo se richiesto
  const eligibleGuests = guests.filter(
    (g) =>
      g.invitation_type === 'full' &&
      (g.response_status === 'confirmed' || (includePending && g.response_status === 'pending'))
  )
  const pendingFullCount = guests.filter(
    (g) => g.invitation_type === 'full' && g.response_status === 'pending'
  ).length

  const familyLabel = (key: number, members: Guest[]): string => {
    const head = guests.find((g) => g.id === key) || members[0]
    const label = `${head.name} ${head.surname || ''}`.trim()
    return members.length > 1 ? `${label} +${members.length - 1}` : label
  }

  const familiesMap = eligibleGuests.reduce((acc, guest) => {
    const key = guest.family_id ?? guest.id
    const family = acc.get(key) || {
      key,
      label: '',
      members: [] as Guest[],
      unassigned: [] as Guest[],
      tagIds: new Set<number>(),
      assignedTableId: null as number | null,
    }
    family.members.push(guest)
    if (guest.table_id == null) {
      family.unassigned.push(guest)
    } else {
      family.assignedTableId = guest.table_id
    }
    for (const tagId of tagsByGuestId.get(guest.id) || []) {
      family.tagIds.add(tagId)
    }
    acc.set(key, family)
    return acc
  }, new Map<number, FamilyGroup>())

  const families: FamilyGroup[] = Array.from(familiesMap.values()).map((f) => ({
    ...f,
    label: familyLabel(f.key, f.members),
  }))

  const unassignedFamilies = families
    .filter((f) => f.unassigned.length > 0)
    .sort((a, b) => b.unassigned.length - a.unassigned.length || a.label.localeCompare(b.label))

  // Occupanti per tavolo: chiunque abbia table_id (anche rifiutati -> warning)
  const occupantsByTable = guests.reduce((acc, guest) => {
    if (guest.table_id != null) {
      const list = acc.get(guest.table_id) || []
      list.push(guest)
      acc.set(guest.table_id, list)
    }
    return acc
  }, new Map<number, Guest[]>())

  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0)
  const totalAssigned = guests.filter((g) => g.table_id != null && g.response_status !== 'declined').length
  const totalToSeat = eligibleGuests.length

  const proposalByTable = (proposal?.assignments || []).reduce((acc, a) => {
    const list = acc.get(a.table_id) || []
    list.push(a.guest_id)
    acc.set(a.table_id, list)
    return acc
  }, new Map<number, number[]>())

  // ---- API actions ----

  const apiCall = async (fn: () => Promise<Response>, reload = true) => {
    setSaving(true)
    setError('')
    try {
      const response = await fn()
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Operazione fallita')
        return false
      }
      if (reload) await loadData()
      return true
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
      return false
    } finally {
      setSaving(false)
    }
  }

  const createTable = async () => {
    if (!newTable.name.trim()) return
    const ok = await apiCall(() =>
      fetch('/api/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTable, adminKey }),
      })
    )
    if (ok) setNewTable({ name: '', capacity: 10 })
  }

  const updateTable = async (id: number) => {
    const ok = await apiCall(() =>
      fetch(`/api/tables/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editTableForm, adminKey }),
      })
    )
    if (ok) setEditingTable(null)
  }

  const deleteTable = async (id: number) => {
    if (!confirm('Eliminare questo tavolo? Gli ospiti assegnati torneranno tra i non assegnati.')) return
    await apiCall(() => fetch(`/api/tables/${id}?adminKey=${adminKey}`, { method: 'DELETE' }))
  }

  const createTag = async () => {
    if (!newTag.name.trim()) return
    const ok = await apiCall(() =>
      fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTag, adminKey }),
      })
    )
    if (ok) setNewTag({ name: '', color: TAG_COLORS[0] })
  }

  const deleteTag = async (id: number) => {
    if (!confirm('Eliminare questo tag? Verrà rimosso da tutti gli ospiti.')) return
    await apiCall(() => fetch(`/api/tags/${id}?adminKey=${adminKey}`, { method: 'DELETE' }))
  }

  const toggleTag = async (memberIds: number[], tagId: number, action: 'add' | 'remove') => {
    // Aggiornamento ottimistico: il chip cambia subito, l'API viene chiamata
    // in background; in caso di errore si ricarica lo stato reale dal server
    setGuestTags((prev) => {
      if (action === 'remove') {
        return prev.filter((gt) => !(gt.tag_id === tagId && memberIds.includes(gt.guest_id)))
      }
      const alreadyTagged = new Set(prev.filter((gt) => gt.tag_id === tagId).map((gt) => gt.guest_id))
      const additions = memberIds
        .filter((id) => !alreadyTagged.has(id))
        .map((id) => ({ guest_id: id, tag_id: tagId }))
      return [...prev, ...additions]
    })

    try {
      const response = await fetch('/api/guests/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guest_ids: memberIds, tag_id: tagId, action, adminKey }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error || 'Errore nel salvataggio del tag')
        await loadData()
      }
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
      await loadData()
    }
  }

  const assignGuests = async (guestIds: number[], tableId: number | null) => {
    await apiCall(() =>
      fetch('/api/tables/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignments: guestIds.map((id) => ({ guest_id: id, table_id: tableId })),
          adminKey,
        }),
      })
    )
  }

  const requestProposal = async (mode: 'fill' | 'reset') => {
    if (mode === 'reset' && !confirm('Ricalcolare tutto da zero? La proposta ignorerà le assegnazioni attuali (nulla viene salvato finché non applichi).')) return
    setSaving(true)
    setError('')
    setProposal(null)
    setLayout(null)
    try {
      const response = await fetch('/api/tables/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, include_pending: includePending, adminKey }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Errore nel calcolo della proposta')
        return
      }
      setProposal(data.proposal)
      if ((data.proposal?.assignments || []).length === 0) {
        setError('Nessun ospite da assegnare: tutti i confermati hanno già un tavolo')
        setProposal(null)
      }
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const applyProposal = async () => {
    if (!proposal) return
    const ok = await apiCall(() =>
      fetch('/api/tables/assign', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments: proposal.assignments, adminKey }),
      })
    )
    if (ok) setProposal(null)
  }

  const requestLayout = async () => {
    setSaving(true)
    setError('')
    setProposal(null)
    setLayout(null)
    try {
      const response = await fetch('/api/tables/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          min_seats: layoutSeats.min,
          max_seats: layoutSeats.max,
          include_pending: includePending,
          adminKey,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Errore nel calcolo del layout')
        return
      }
      setLayout(data.layout)
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSaving(false)
    }
  }

  const applyLayout = async () => {
    if (!layout) return
    if (tables.length > 0) {
      const ok = confirm(
        `Applicando il layout, i ${tables.length} tavoli esistenti verranno eliminati e le assegnazioni attuali azzerate. Gli ospiti e le loro conferme NON vengono toccati. Continuare?`
      )
      if (!ok) return
    }
    const success = await apiCall(() =>
      fetch('/api/tables/apply-layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tables: layout.tables.map((t) => ({
            name: t.name,
            capacity: t.capacity,
            guest_ids: t.guestIds,
          })),
          replace_existing: tables.length > 0,
          adminKey,
        }),
      })
    )
    if (success) setLayout(null)
  }

  // ---- Render ----

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

  const renderTagChip = (tagId: number, small = false) => {
    const tag = tagById.get(tagId)
    if (!tag) return null
    return (
      <span
        key={tag.id}
        className={`inline-block rounded-full text-white ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'}`}
        style={{ backgroundColor: tag.color }}
      >
        {tag.name}
      </span>
    )
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-5xl font-serif text-wedding-sage-dark">Gestione Tavoli</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2 text-sm text-gray-700 bg-white/80 px-4 py-3 rounded-lg shadow cursor-pointer">
              <input
                type="checkbox"
                checked={includePending}
                onChange={(e) => {
                  setIncludePending(e.target.checked)
                  setProposal(null)
                  setLayout(null)
                }}
                className="w-4 h-4 accent-amber-600"
              />
              Includi anche gli ospiti in attesa
            </label>
            <button
              onClick={() => requestProposal('fill')}
              disabled={saving || tables.length === 0}
              className="bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all font-serif disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proponi disposizione
            </button>
            <button
              onClick={() => requestProposal('reset')}
              disabled={saving || tables.length === 0}
              className="bg-white border border-wedding-sage-dark text-wedding-sage-dark px-6 py-3 rounded-lg hover:bg-gray-50 transition-all font-serif disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ricalcola da zero
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-gray-800">{tables.length}</div>
            <div className="text-gray-600">Tavoli</div>
          </div>
          <div className="bg-white/80 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-gray-800">{totalCapacity}</div>
            <div className="text-gray-600">Posti Totali</div>
          </div>
          <div className="bg-green-50 p-6 rounded-lg shadow-lg text-center">
            <div className="text-3xl font-bold text-green-800">{totalAssigned}/{totalToSeat}</div>
            <div className="text-gray-600">Confermati Assegnati</div>
          </div>
          <div className={`p-6 rounded-lg shadow-lg text-center ${includePending ? 'bg-amber-50' : 'bg-gray-50'}`}>
            <div className={`text-3xl font-bold ${includePending ? 'text-amber-700' : 'text-gray-800'}`}>{pendingFullCount}</div>
            <div className="text-gray-600">In Attesa ({includePending ? 'inclusi' : 'esclusi'})</div>
          </div>
        </div>

        {error && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        {/* Proposal preview banner */}
        {proposal && (
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-serif text-blue-900 mb-1">Anteprima proposta</h2>
                <p className="text-sm text-blue-800">
                  {proposal.assignments.length} ospiti verrebbero assegnati (evidenziati in blu qui sotto).
                  Nulla è ancora stato salvato.
                </p>
                {proposal.unplacedFamilies.length > 0 && (
                  <p className="text-sm text-red-700 mt-1">
                    Attenzione: {proposal.unplacedFamilies.length}{' '}
                    {proposal.unplacedFamilies.length === 1 ? 'famiglia non trova' : 'famiglie non trovano'} posto
                    (capienza insufficiente).
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={applyProposal}
                  disabled={saving}
                  className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50"
                >
                  Applica proposta
                </button>
                <button
                  onClick={() => setProposal(null)}
                  className="bg-white border border-blue-300 text-blue-800 px-6 py-2 rounded-lg hover:bg-blue-100"
                >
                  Scarta
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Layout suggestion preview */}
        {layout && (
          <div className="mb-8 p-6 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <div>
                <h2 className="text-xl font-serif text-purple-900 mb-1">Layout suggerito</h2>
                <p className="text-sm text-purple-800">
                  {layout.tables.length} tavoli per {layout.tables.reduce((sum, t) => sum + t.guestIds.length, 0)} ospiti.
                  Nulla è ancora stato salvato.
                </p>
                {tables.length > 0 && (
                  <p className="text-sm text-red-700 mt-1">
                    Applicando, i {tables.length} tavoli attuali verranno sostituiti (gli ospiti e le conferme restano intatti).
                  </p>
                )}
                {layout.unplacedFamilies.length > 0 && (
                  <p className="text-sm text-red-700 mt-1">
                    Attenzione: {layout.unplacedFamilies.length}{' '}
                    {layout.unplacedFamilies.length === 1 ? 'famiglia non trova' : 'famiglie non trovano'} posto.
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={applyLayout}
                  disabled={saving}
                  className="bg-purple-700 text-white px-6 py-2 rounded-lg hover:bg-purple-800 disabled:opacity-50"
                >
                  Crea tavoli e applica
                </button>
                <button
                  onClick={() => setLayout(null)}
                  className="bg-white border border-purple-300 text-purple-800 px-6 py-2 rounded-lg hover:bg-purple-100"
                >
                  Scarta
                </button>
              </div>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {layout.tables.map((t) => (
                <div key={t.name} className="bg-white/70 border border-purple-200 rounded p-3 text-sm">
                  <div className="font-semibold text-purple-900 mb-1">
                    {t.name} — {t.guestIds.length} {t.guestIds.length === 1 ? 'persona' : 'persone'} (capienza {t.capacity})
                  </div>
                  <div className="text-gray-700">
                    {t.guestIds
                      .map((id) => guests.find((g) => g.id === id))
                      .filter((g): g is Guest => !!g)
                      .map((g) => `${g.name} ${g.surname || ''}`.trim())
                      .join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tag management */}
        <div className="bg-white/80 p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">Tag</h2>
          <p className="text-sm text-gray-600 mb-4">
            I tag descrivono i gruppi di affinità (es. &quot;Amici università&quot;, &quot;Colleghi&quot;, &quot;Parenti sposa&quot;).
            L&apos;auto-assegnazione cerca di sedere vicine le famiglie che condividono tag.
          </p>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {tags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="hover:opacity-70 font-bold"
                  title="Elimina tag"
                >
                  ×
                </button>
              </span>
            ))}
            {tags.length === 0 && <span className="text-gray-500 text-sm">Nessun tag ancora</span>}
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Nuovo tag"
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              onKeyPress={(e) => e.key === 'Enter' && createTag()}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
            />
            <div className="flex gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewTag({ ...newTag, color })}
                  className={`w-7 h-7 rounded-full border-2 ${newTag.color === color ? 'border-gray-800' : 'border-transparent'}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <button
              onClick={createTag}
              disabled={saving || !newTag.name.trim()}
              className="bg-wedding-sage-dark text-white px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
            >
              Aggiungi Tag
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Unassigned families */}
          <div className="bg-white/80 p-6 rounded-lg shadow-lg lg:col-span-1 self-start">
            <h2 className="text-2xl font-serif text-wedding-sage-dark mb-2">Da Assegnare</h2>
            <p className="text-sm text-gray-600 mb-4">
              Famiglie con ospiti {includePending ? 'confermati o in attesa' : 'confermati'} (cerimonia completa) senza tavolo.
              Clicca sui tag per assegnarli alla famiglia.
              {includePending && <span className="text-amber-700"> Gli ospiti in attesa sono segnati con (?).</span>}
            </p>
            {loading ? (
              <div className="text-center py-8">Caricamento...</div>
            ) : unassignedFamilies.length === 0 ? (
              <div className="text-center py-8 text-gray-600">Tutti i confermati hanno un tavolo 🎉</div>
            ) : (
              <div className="space-y-3">
                {unassignedFamilies.map((family) => (
                  <div key={family.key} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-800">{family.label}</span>
                      <span className="text-xs text-gray-500">
                        {family.unassigned.length} {family.unassigned.length === 1 ? 'posto' : 'posti'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mb-2">
                      {family.unassigned.map((m, i) => (
                        <span key={m.id}>
                          {i > 0 && ', '}
                          {m.name}
                          {m.response_status === 'pending' && <span className="text-amber-600" title="In attesa di risposta"> (?)</span>}
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {Array.from(family.tagIds).map((tagId) => renderTagChip(tagId, true))}
                      <button
                        onClick={() => setTaggingFamily(taggingFamily === family.key ? null : family.key)}
                        className="text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-gray-400 text-gray-500 hover:border-gray-600"
                      >
                        {taggingFamily === family.key ? 'chiudi' : '+ tag'}
                      </button>
                    </div>
                    {taggingFamily === family.key && (
                      <div className="mb-2">
                        <TagPanel
                          members={family.members}
                          tags={tags}
                          tagsByGuestId={tagsByGuestId}
                          saving={saving}
                          onToggle={toggleTag}
                        />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <select
                        value=""
                        disabled={saving || tables.length === 0}
                        onChange={(e) => {
                          if (e.target.value) assignGuests(family.unassigned.map((m) => m.id), parseInt(e.target.value))
                        }}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        <option value="">
                          {family.assignedTableId != null
                            ? `Assegna (resto famiglia: ${tableById.get(family.assignedTableId)?.name || '?'})`
                            : 'Assegna a tavolo...'}
                        </option>
                        {tables.map((table) => {
                          const occupied = (occupantsByTable.get(table.id) || []).length
                          const free = table.capacity - occupied
                          return (
                            <option key={table.id} value={table.id} disabled={free < family.unassigned.length}>
                              {table.name} ({free} liberi)
                            </option>
                          )
                        })}
                      </select>
                      {family.unassigned.length > 1 && (
                        <button
                          onClick={() => setSplitFamily(splitFamily === family.key ? null : family.key)}
                          className={`px-2 py-1.5 rounded text-xs border whitespace-nowrap ${
                            splitFamily === family.key
                              ? 'bg-wedding-sage-dark text-white border-wedding-sage-dark'
                              : 'text-gray-600 border-gray-300 hover:border-gray-500'
                          }`}
                          title="Assegna i membri a tavoli diversi"
                        >
                          Dividi
                        </button>
                      )}
                    </div>
                    {splitFamily === family.key && (
                      <div className="mt-2 p-2 bg-gray-50 rounded space-y-1.5">
                        {family.unassigned.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700">
                              {`${m.name} ${m.surname || ''}`.trim()}
                              {m.response_status === 'pending' && <span className="text-amber-600" title="In attesa di risposta"> (?)</span>}
                            </span>
                            <select
                              value=""
                              disabled={saving || tables.length === 0}
                              onChange={(e) => {
                                if (e.target.value) assignGuests([m.id], parseInt(e.target.value))
                              }}
                              className="px-1.5 py-1 border border-gray-300 rounded text-xs"
                            >
                              <option value="">Tavolo...</option>
                              {tables.map((table) => {
                                const occupied = (occupantsByTable.get(table.id) || []).length
                                const free = table.capacity - occupied
                                return (
                                  <option key={table.id} value={table.id} disabled={free < 1}>
                                    {table.name} ({free})
                                  </option>
                                )
                              })}
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tables */}
          <div className="lg:col-span-2">
            {/* Layout designer */}
            <div className="bg-white/80 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-2xl font-serif text-wedding-sage-dark mb-2">Progetta Tavoli</h2>
              <p className="text-sm text-gray-600 mb-4">
                Indica quanti posti può avere un tavolo e il sistema suggerisce quanti tavoli servono,
                di che dimensione e chi farci sedere (in base a famiglie e tag). Vedrai un&apos;anteprima prima di salvare.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <label className="text-sm text-gray-700">
                  Posti min
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={layoutSeats.min}
                    onChange={(e) => setLayoutSeats({ ...layoutSeats, min: parseInt(e.target.value) || 1 })}
                    className="ml-2 w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
                  />
                </label>
                <label className="text-sm text-gray-700">
                  Posti max
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={layoutSeats.max}
                    onChange={(e) => setLayoutSeats({ ...layoutSeats, max: parseInt(e.target.value) || 1 })}
                    className="ml-2 w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
                  />
                </label>
                <button
                  onClick={requestLayout}
                  disabled={saving || layoutSeats.min > layoutSeats.max}
                  className="bg-wedding-sage-dark text-white px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suggerisci tavoli
                </button>
                {layoutSeats.min > layoutSeats.max && (
                  <span className="text-xs text-red-600">Il minimo non può superare il massimo</span>
                )}
              </div>
            </div>

            {/* Add table form */}
            <div className="bg-white/80 p-6 rounded-lg shadow-lg mb-6">
              <h2 className="text-2xl font-serif text-wedding-sage-dark mb-4">Aggiungi Tavolo</h2>
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  placeholder="Nome tavolo *"
                  value={newTable.name}
                  onChange={(e) => setNewTable({ ...newTable, name: e.target.value })}
                  onKeyPress={(e) => e.key === 'Enter' && createTable()}
                  className="flex-1 min-w-[180px] px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={newTable.capacity}
                  onChange={(e) => setNewTable({ ...newTable, capacity: parseInt(e.target.value) || 1 })}
                  className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark"
                  title="Capienza"
                />
                <button
                  onClick={createTable}
                  disabled={saving || !newTable.name.trim()}
                  className="bg-wedding-sage-dark text-white px-6 py-2 rounded-lg hover:bg-opacity-90 disabled:opacity-50"
                >
                  Aggiungi
                </button>
              </div>
            </div>

            {tables.length === 0 ? (
              <div className="bg-white/80 p-8 rounded-lg shadow-lg text-center text-gray-600">
                Nessun tavolo ancora: creane uno per iniziare
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tables.map((table) => {
                  const occupants = occupantsByTable.get(table.id) || []
                  const activeOccupants = occupants.filter((g) => g.response_status !== 'declined')
                  const declinedOccupants = occupants.filter((g) => g.response_status === 'declined')
                  const proposedIds = proposalByTable.get(table.id) || []
                  const proposedGuests = proposedIds
                    .map((id) => guests.find((g) => g.id === id))
                    .filter((g): g is Guest => !!g && g.table_id !== table.id)
                  const fillAfterProposal = occupants.length + proposedGuests.length
                  const fillRatio = Math.min(occupants.length / table.capacity, 1)

                  // raggruppa occupanti per famiglia
                  const occupantFamilies = activeOccupants.reduce((acc, g) => {
                    const key = g.family_id ?? g.id
                    const list = acc.get(key) || []
                    list.push(g)
                    acc.set(key, list)
                    return acc
                  }, new Map<number, Guest[]>())

                  return (
                    <div key={table.id} className="bg-white/80 rounded-lg shadow-lg overflow-hidden">
                      <div className="p-4 bg-gray-50 border-b">
                        {editingTable === table.id ? (
                          <div className="flex flex-wrap gap-2 items-center">
                            <input
                              type="text"
                              value={editTableForm.name}
                              onChange={(e) => setEditTableForm({ ...editTableForm, name: e.target.value })}
                              className="flex-1 min-w-[120px] px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={editTableForm.capacity}
                              onChange={(e) => setEditTableForm({ ...editTableForm, capacity: parseInt(e.target.value) || 1 })}
                              className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button onClick={() => updateTable(table.id)} disabled={saving} className="text-green-600 hover:text-green-800 text-sm">Salva</button>
                            <button onClick={() => setEditingTable(null)} className="text-gray-600 hover:text-gray-800 text-sm">Annulla</button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-serif text-lg text-wedding-sage-dark">{table.name}</span>
                              <span className={`ml-3 text-sm ${occupants.length > table.capacity ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
                                {occupants.length}/{table.capacity}
                                {proposedGuests.length > 0 && (
                                  <span className="text-blue-700"> → {fillAfterProposal}/{table.capacity}</span>
                                )}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingTable(table.id)
                                  setEditTableForm({ name: table.name, capacity: table.capacity })
                                }}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                              >
                                Modifica
                              </button>
                              <button
                                onClick={() => deleteTable(table.id)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Elimina
                              </button>
                            </div>
                          </div>
                        )}
                        <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${occupants.length > table.capacity ? 'bg-red-500' : 'bg-wedding-sage-dark'}`}
                            style={{ width: `${fillRatio * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="p-4 space-y-2">
                        {occupants.length === 0 && proposedGuests.length === 0 && (
                          <div className="text-sm text-gray-400 text-center py-2">Tavolo vuoto</div>
                        )}

                        {Array.from(occupantFamilies.entries()).map(([key, members]) => {
                          const memberTagIds = new Set<number>()
                          members.forEach((m) => (tagsByGuestId.get(m.id) || []).forEach((t) => memberTagIds.add(t)))
                          const splitKey = `${table.id}:${key}`
                          const isSplit = splitTableFamily === splitKey
                          return (
                            <div key={key} className="text-sm border border-gray-100 rounded p-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="text-gray-800">
                                    {members.map((m, i) => (
                                      <span key={m.id}>
                                        {i > 0 && ', '}
                                        {`${m.name} ${m.surname || ''}`.trim()}
                                        {m.response_status === 'pending' && <span className="text-amber-600" title="In attesa di risposta"> (?)</span>}
                                      </span>
                                    ))}
                                  </div>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {Array.from(memberTagIds).map((tagId) => renderTagChip(tagId, true))}
                                  </div>
                                </div>
                                <div className="flex gap-2 whitespace-nowrap">
                                  <button
                                    onClick={() => setTagTableFamily(tagTableFamily === splitKey ? null : splitKey)}
                                    className={`text-xs ${tagTableFamily === splitKey ? 'text-wedding-sage-dark font-semibold' : 'text-gray-400 hover:text-gray-700'}`}
                                    title="Modifica i tag di questo gruppo"
                                  >
                                    Tag
                                  </button>
                                  {members.length > 1 && (
                                    <button
                                      onClick={() => setSplitTableFamily(isSplit ? null : splitKey)}
                                      className={`text-xs ${isSplit ? 'text-wedding-sage-dark font-semibold' : 'text-gray-400 hover:text-gray-700'}`}
                                      title="Sposta o togli singoli membri"
                                    >
                                      Dividi
                                    </button>
                                  )}
                                  <button
                                    onClick={() => assignGuests(members.map((m) => m.id), null)}
                                    disabled={saving}
                                    className="text-gray-400 hover:text-red-600 text-xs"
                                    title="Rimuovi dal tavolo"
                                  >
                                    Rimuovi
                                  </button>
                                </div>
                              </div>
                              {tagTableFamily === splitKey && (
                                <div className="mt-2">
                                  <TagPanel
                                    members={members}
                                    tags={tags}
                                    tagsByGuestId={tagsByGuestId}
                                    saving={saving}
                                    onToggle={toggleTag}
                                  />
                                </div>
                              )}
                              {isSplit && (
                                <div className="mt-2 p-2 bg-gray-50 rounded space-y-1.5">
                                  {members.map((m) => (
                                    <div key={m.id} className="flex items-center justify-between gap-2">
                                      <span className="text-xs text-gray-700">
                                        {`${m.name} ${m.surname || ''}`.trim()}
                                        {m.response_status === 'pending' && <span className="text-amber-600"> (?)</span>}
                                      </span>
                                      <select
                                        value=""
                                        disabled={saving}
                                        onChange={(e) => {
                                          if (e.target.value === 'none') assignGuests([m.id], null)
                                          else if (e.target.value) assignGuests([m.id], parseInt(e.target.value))
                                        }}
                                        className="px-1.5 py-1 border border-gray-300 rounded text-xs"
                                      >
                                        <option value="">Sposta...</option>
                                        <option value="none">Togli dal tavolo</option>
                                        {tables.filter((t) => t.id !== table.id).map((t) => {
                                          const free = t.capacity - (occupantsByTable.get(t.id) || []).length
                                          return (
                                            <option key={t.id} value={t.id} disabled={free < 1}>
                                              {t.name} ({free})
                                            </option>
                                          )
                                        })}
                                      </select>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}

                        {declinedOccupants.length > 0 && (
                          <div className="border border-red-200 bg-red-50 rounded p-2 text-sm">
                            <div className="text-red-700 font-medium mb-1">Hanno rifiutato ma occupano posti:</div>
                            {declinedOccupants.map((g) => (
                              <div key={g.id} className="flex items-center justify-between">
                                <span className="text-red-800">{g.name} {g.surname || ''}</span>
                                <button
                                  onClick={() => assignGuests([g.id], null)}
                                  disabled={saving}
                                  className="text-red-600 hover:text-red-800 text-xs underline"
                                >
                                  Libera posto
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {proposedGuests.length > 0 && (
                          <div className="border border-dashed border-blue-300 bg-blue-50 rounded p-2 text-sm">
                            <div className="text-blue-700 font-medium mb-1">Proposta:</div>
                            <div className="text-blue-900">
                              {proposedGuests.map((g) => `${g.name} ${g.surname || ''}`.trim()).join(', ')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
