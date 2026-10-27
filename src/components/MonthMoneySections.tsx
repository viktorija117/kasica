import { useCallback, useMemo, useState } from 'react'
import type { Income } from '../data/incomes'
import type { Saving } from '../data/savings'
import { useIncomes } from '../hooks/useIncomes'
import { useSavings } from '../hooks/useSavings'
import { sr } from '../i18n/sr'
import { sumAmounts } from '../lib/budget'
import { dayLabel, type MonthKey } from '../lib/dates'
import type { EntryRequest } from '../lib/entryForms'
import { IncomeSheet } from './IncomeSheet'
import { MoneyEntrySection, type EntryRow } from './MoneyEntrySection'
import { QueryStatus } from './QueryStatus'
import { SavingSheet } from './SavingSheet'

type Props = {
  month: MonthKey
  memberNames: ReadonlyMap<string, string>
}

function incomeRow(income: Income, memberNames: ReadonlyMap<string, string>): EntryRow {
  const receivedBy = income.received_by ? memberNames.get(income.received_by) : undefined
  return {
    id: income.id,
    title: income.source,
    subtitle: [dayLabel(income.date), receivedBy, income.note].filter(Boolean).join(' · '),
    amount: income.amount,
  }
}

function savingRow(saving: Saving): EntryRow {
  const kind = saving.amount < 0 ? sr.saving.withdrawal : sr.saving.deposit
  return {
    id: saving.id,
    title: saving.note ?? kind,
    subtitle: [dayLabel(saving.date), saving.note ? kind : null].filter(Boolean).join(' · '),
    amount: saving.amount,
  }
}

/** Incomes and savings of the month, shown above the expense list. */
export function MonthMoneySections({ month, memberNames }: Props) {
  const { incomes, error: incomesError } = useIncomes(month)
  const { savings, error: savingsError } = useSavings(month)
  const [incomeSheet, setIncomeSheet] = useState<EntryRequest<Income> | null>(null)
  const [savingSheet, setSavingSheet] = useState<EntryRequest<Saving> | null>(null)

  const incomeRows = useMemo(
    () => incomes?.map((income) => incomeRow(income, memberNames)),
    [incomes, memberNames],
  )
  const savingRows = useMemo(() => savings?.map(savingRow), [savings])
  // Stable, so an open sheet does not take the focus back on every re-render.
  const closeIncome = useCallback(() => setIncomeSheet(null), [])
  const closeSaving = useCallback(() => setSavingSheet(null), [])

  if (!incomes || !savings || !incomeRows || !savingRows) {
    return <QueryStatus error={incomesError ?? savingsError} />
  }

  const openIncome = (id: string) => {
    const entry = incomes.find((income) => income.id === id)
    if (entry) setIncomeSheet({ mode: 'edit', entry })
  }
  const openSaving = (id: string) => {
    const entry = savings.find((saving) => saving.id === id)
    if (entry) setSavingSheet({ mode: 'edit', entry })
  }

  return (
    <div className="mb-4 flex flex-col gap-2">
      <MoneyEntrySection
        title={sr.income.title}
        total={sumAmounts(incomes)}
        addLabel={sr.income.add}
        emptyText={sr.income.empty}
        rows={incomeRows}
        onAdd={() => setIncomeSheet({ mode: 'add' })}
        onOpen={openIncome}
      />
      <MoneyEntrySection
        title={sr.saving.title}
        total={sumAmounts(savings)}
        addLabel={sr.saving.add}
        emptyText={sr.saving.empty}
        rows={savingRows}
        onAdd={() => setSavingSheet({ mode: 'add' })}
        onOpen={openSaving}
      />
      <IncomeSheet request={incomeSheet} month={month} onClose={closeIncome} />
      <SavingSheet request={savingSheet} month={month} onClose={closeSaving} />
    </div>
  )
}
