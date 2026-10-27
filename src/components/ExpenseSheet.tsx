import { useRef } from 'react'
import { useSession } from '../hooks/useAuth'
import { useSuggestions } from '../hooks/useExpenses'
import type { ExpenseSheetRequest } from '../hooks/useExpenseSheet'
import { useCategories, useMembers } from '../hooks/useHousehold'
import { sr } from '../i18n/sr'
import { BottomSheet } from './BottomSheet'
import { ExpenseForm } from './ExpenseForm'
import { QueryStatus } from './QueryStatus'

type Props = {
  request: ExpenseSheetRequest | null
  onClose: () => void
}

export function ExpenseSheet({ request, onClose }: Props) {
  const userId = useSession().user.id
  const categories = useCategories()
  const members = useMembers()
  const suggestions = useSuggestions()
  const amountRef = useRef<HTMLInputElement>(null)

  const title = request?.mode === 'edit' ? sr.expenseForm.editTitle : sr.expenseForm.addTitle

  return (
    <BottomSheet
      open={request !== null}
      title={title}
      onClose={onClose}
      // Adding starts at the amount with the keyboard open; editing does not pop it up.
      initialFocusRef={request?.mode === 'add' ? amountRef : undefined}
    >
      {request &&
        (categories.data && members.data ? (
          <ExpenseForm
            key={request.mode === 'edit' ? request.expense.id : 'add'}
            request={request}
            categories={categories.data}
            members={members.data}
            suggestions={suggestions.data ?? []}
            currentUserId={userId}
            amountRef={amountRef}
            onDone={onClose}
          />
        ) : (
          <QueryStatus error={categories.error ?? members.error} />
        ))}
    </BottomSheet>
  )
}
