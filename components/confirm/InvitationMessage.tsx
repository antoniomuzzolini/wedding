import { InvitationType } from '@/lib/types'
import { INVITATION_MESSAGES } from '@/lib/utils/constants'

interface InvitationMessageProps {
  invitationType: InvitationType
  familyMembersCount: number
}

export default function InvitationMessage({ 
  invitationType, 
  familyMembersCount 
}: InvitationMessageProps) {
  const messages = invitationType === 'full' 
    ? INVITATION_MESSAGES.FULL_CEREMONY 
    : INVITATION_MESSAGES.EVENING

  const isMultiple = familyMembersCount > 1

  return (
    <div className="text-center mb-6 space-y-2">
      <p className="text-lg text-gray-700">
        {isMultiple ? messages.MULTIPLE : messages.SINGLE}
      </p>
      {isMultiple && (
        <p className="text-lg text-gray-700">
          {messages.FAMILY_CONFIRMATION}
        </p>
      )}
    </div>
  )
}
