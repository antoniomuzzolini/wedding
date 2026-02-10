import { ResponseStatus } from '@/lib/types'
import { MemberResponse } from '@/lib/utils/guest-lookup'

interface MemberResponseFormProps {
  member: any
  memberResponse: MemberResponse
  index: number
  onUpdate: (index: number, field: keyof MemberResponse, value: any) => void
}

export default function MemberResponseForm({
  member,
  memberResponse,
  index,
  onUpdate,
}: MemberResponseFormProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 space-y-4">
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
              onChange={(e) => onUpdate(index, 'response_status', e.target.value as ResponseStatus)}
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
              onChange={(e) => onUpdate(index, 'response_status', e.target.value as ResponseStatus)}
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
            onChange={(e) => onUpdate(index, 'dietary_requirements', e.target.value)}
            placeholder="Allergie o restrizioni alimentari?"
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-wedding-gold focus:border-transparent"
          />
        </div>
      )}
    </div>
  )
}
