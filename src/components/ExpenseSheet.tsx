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

function formKey(request: ExpenseSheetRequest): string {
  if (request.mode === 'edit') return request.expense.id
  if (request.mode === 'pay') return `pay-${request.recurring.id}`
  return 'add'
}

export function ExpenseSheet({ request, onClose }: Props) {
  const userId = useSession().user.id
  const categories = useCategories()
  const members = useMembers()
  const suggestions = useSuggestions()
  const amountRef = useRef<HTMLInputElement>(null)

  const title =
    request?.mode === 'edit'
      ? sr.expenseForm.editTitle
      : request?.mode === 'pay'
        ? sr.expenseForm.payTitle
        : sr.expenseForm.addTitle

  return (
    <BottomSheet
      open={request !== null}
      title={title}
      onClose={onClose}
      // Adding starts at the amount with the keyboard open; editing and paying (all filled in
      // already) do not pop it up.
      initialFocusRef={request?.mode === 'add' ? amountRef : undefined}
    >
      {request &&
        (categories.data && members.data ? (
          <ExpenseForm
            key={formKey(request)}
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
