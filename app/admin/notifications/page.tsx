'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Recipient {
  id: number
  name: string
  surname: string
  email: string
  familyMembersCount: number
  familyMemberNames?: string[]
}

export default function NotificationsPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [adminKey, setAdminKey] = useState('')
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [previewEmail, setPreviewEmail] = useState('')

  useEffect(() => {
    // Check if already authenticated
    const stored = localStorage.getItem('adminAuthenticated')
    const storedKey = localStorage.getItem('adminKey')
    if (stored === 'true' && storedKey) {
      setAuthenticated(true)
      setAdminKey(storedKey)
    }
  }, [])

  useEffect(() => {
    if (authenticated && adminKey) {
      loadRecipients()
    }
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
        localStorage.setItem('adminKey', adminKey)
        // Dispatch event to update navigation
        window.dispatchEvent(new Event('adminAuthChanged'))
        loadRecipients()
      } else {
        setError(data.error || 'Chiave admin non valida')
      }
    } catch (err) {
      setError('Errore di connessione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const loadRecipients = async () => {
    if (!adminKey) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/admin/notifications/recipients?adminKey=${adminKey}`)
      
      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nel caricamento dei destinatari')
        setLoading(false)
        return
      }

      const data = await response.json()
      setRecipients(data.recipients || [])
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLoading(false)
    }
  }

  const generateEmailPreview = (recipient: Recipient) => {
    let greeting: string
    if (recipient.familyMembersCount > 1 && recipient.familyMemberNames && recipient.familyMemberNames.length > 1) {
      // Format names: "Ciao Marco, Anna e Matteo"
      const names = recipient.familyMemberNames
      if (names.length === 2) {
        greeting = `Ciao ${names[0]} e ${names[1]},`
      } else {
        const lastName = names[names.length - 1]
        const otherNames = names.slice(0, -1).join(', ')
        greeting = `Ciao ${otherNames} e ${lastName},`
      }
    } else {
      greeting = `Ciao ${recipient.name},`
    }

    const closing = `Un abbraccio,\nFrancesca e Antonio`

    // Get site URL from env or use default
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-domain.com'
    const siteLink = `\n\nVisita il nostro sito: ${siteUrl}`

    return `${greeting}\n\n${messageBody || '[Messaggio centrale]'}\n\n${closing}${siteLink}`
  }

  const handlePreview = () => {
    if (recipients.length === 0) {
      setError('Nessun destinatario disponibile')
      return
    }
    setPreviewEmail(generateEmailPreview(recipients[0]))
  }

  const sendEmails = async () => {
    if (!messageBody.trim()) {
      setError('Il messaggio centrale è obbligatorio')
      return
    }

    if (recipients.length === 0) {
      setError('Nessun destinatario disponibile')
      return
    }

    setSending(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminKey,
          messageBody: messageBody.trim(),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Email inviate con successo a ${data.sentCount} destinatari`)
        setMessageBody('')
        setPreviewEmail('')
      } else {
        setError(data.error || 'Errore nell\'invio delle email')
      }
    } catch (err) {
      setError('Si è verificato un errore: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setSending(false)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white/80 p-8 rounded-lg shadow-lg max-w-md w-full">
          <h1 className="text-3xl font-serif text-wedding-sage-dark text-center mb-6">
            Accesso Admin
          </h1>
          <div className="space-y-4">
            <div>
              <label htmlFor="adminKey" className="block text-gray-700 font-medium mb-2">
                Chiave Admin
              </label>
              <input
                id="adminKey"
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && authenticate()}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark focus:border-transparent"
                placeholder="Inserisci la chiave admin"
              />
            </div>
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
            )}
            <button
              onClick={authenticate}
              disabled={loading || !adminKey}
              className="w-full bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-serif text-wedding-sage-dark">
            Invio Notifiche Email
          </h1>
        </div>

        <div className="bg-white/80 p-8 rounded-lg shadow-lg space-y-6">
          {/* Recipients Info */}
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-serif text-wedding-sage-dark mb-2">
              Destinatari
            </h2>
            {loading ? (
              <p className="text-gray-600">Caricamento destinatari...</p>
            ) : (
              <p className="text-gray-700">
                {recipients.length === 0
                  ? 'Nessun destinatario con email configurata'
                  : `${recipients.length} destinatari con email configurata`}
              </p>
            )}
          </div>

          {/* Message Configuration */}
          <div>
            <label htmlFor="messageBody" className="block text-gray-700 font-medium mb-2">
              Messaggio Centrale *
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Questo messaggio verrà inserito tra il saluto personalizzato e la chiusura dell'email.
            </p>
            <textarea
              id="messageBody"
              value={messageBody}
              onChange={(e) => setMessageBody(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-sage-dark focus:border-transparent"
              placeholder="Inserisci il messaggio centrale che verrà inviato a tutti i destinatari..."
            />
          </div>

          {/* Preview */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-gray-700 font-medium">
                Anteprima Email
              </label>
              <button
                onClick={handlePreview}
                disabled={!messageBody.trim() || recipients.length === 0}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1 rounded hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Genera Anteprima
              </button>
            </div>
            {previewEmail && (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                  {previewEmail}
                </pre>
              </div>
            )}
          </div>

          {/* Email Template Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Struttura Email:</h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li><strong>Saluto:</strong> "Ciao [Nome]," per singoli o "Ciao [Nome1], [Nome2] e [Nome3]," per gruppi</li>
              <li><strong>Messaggio centrale:</strong> Il testo che inserisci sopra</li>
              <li><strong>Chiusura:</strong> "Un abbraccio, Francesca e Antonio"</li>
              <li><strong>Link al sito:</strong> Viene aggiunto automaticamente alla fine come link cliccabile</li>
            </ul>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">{error}</div>
          )}
          {success && (
            <div className="p-4 bg-green-50 text-green-700 rounded-lg">{success}</div>
          )}

          {/* Send Button */}
          <button
            onClick={sendEmails}
            disabled={sending || !messageBody.trim() || recipients.length === 0}
            className="w-full bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
          >
            {sending ? 'Invio in corso...' : `Invia Email a ${recipients.length} Destinatari`}
          </button>
        </div>
      </div>
    </div>
  )
}
