import type { HouseholdMember } from '../data/households'
import { sr } from '../i18n/sr'

type Props = {
  members: HouseholdMember[]
  currentUserId: string
}

export function MembersList({ members, currentUserId }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {members.map((member) => (
        <li key={member.user_id} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-10 place-items-center rounded-full bg-primary-soft font-semibold text-primary"
          >
            {member.display_name.charAt(0).toUpperCase()}
          </span>
          <span className="font-medium">{member.display_name}</span>
          {member.user_id === currentUserId && (
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs text-text-muted">
              {sr.settings.you}
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}
