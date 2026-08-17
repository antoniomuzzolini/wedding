import Link from 'next/link'
import { ResponseStatus } from '@/lib/types'

interface SuccessMessageProps {
  hasConfirmedMembers: boolean
  familyMembersCount: number
  onEdit: () => void
}

export default function SuccessMessage({ hasConfirmedMembers, familyMembersCount, onEdit }: SuccessMessageProps) {
  const isMultiple = familyMembersCount > 1

  return (
    <div className="py-16 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center bg-white/80 p-12 rounded-lg shadow-xl">
        {!hasConfirmedMembers && <div className="text-6xl mb-6">🎉</div>}
        <h1 className="text-4xl font-serif text-wedding-sage-dark mb-4">
          Grazie!
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          {hasConfirmedMembers
            ? isMultiple 
              ? "Siamo così felici di festeggiare con voi!"
              : "Siamo così felici di festeggiare con te!"
            : isMultiple
              ? "Ci dispiace che non possiate esserci, ma grazie per avercelo fatto sapere."
              : "Ci dispiace che non possa esserci, ma grazie per avercelo fatto sapere."}
        </p>
        <button
          onClick={onEdit}
          className="bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all"
        >
          {isMultiple ? "Modifica la vostra risposta" : "Modifica la tua risposta"}
        </button>

        <div className="mt-10 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-4">Nel frattempo, scopri il resto del sito</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { href: '/us', label: 'Noi' },
              { href: '/gift-list', label: 'Lista Nozze' },
              { href: '/contacts', label: 'Contatti' },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-5 py-2 border border-wedding-sage-dark text-wedding-sage-dark rounded-lg hover:bg-wedding-sage-dark hover:text-white transition-all"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
