import { ResponseStatus } from '@/lib/types'

interface SuccessMessageProps {
  hasConfirmedMembers: boolean
  onEdit: () => void
}

export default function SuccessMessage({ hasConfirmedMembers, onEdit }: SuccessMessageProps) {
  return (
    <div className="py-16 px-4 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center bg-white/80 p-12 rounded-lg shadow-xl">
        {!hasConfirmedMembers && <div className="text-6xl mb-6">🎉</div>}
        <h1 className="text-4xl font-serif text-wedding-sage-dark mb-4">
          Grazie!
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          {hasConfirmedMembers
            ? "Siamo così felici di festeggiare con voi!"
            : "Ci dispiace che non possiate esserci, ma grazie per avercelo fatto sapere."}
        </p>
        <button
          onClick={onEdit}
          className="bg-wedding-sage-dark text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-all"
        >
          Modifica la tua risposta
        </button>
      </div>
    </div>
  )
}
