import { useId, useState } from 'react'
import { formatRSD } from '../lib/money'
import { ChevronDownIcon, PlusIcon } from './icons'

export type EntryRow = {
  id: string
  title: string
  subtitle: string
  amount: number
}

type Props = {
  title: string
  total: number
  addLabel: string
  emptyText: string
  rows: EntryRow[]
  onAdd: () => void
  onOpen: (id: string) => void
}

/** A collapsible card with a month's incomes or savings, its total and an add button. */
export function MoneyEntrySection({ title, total, addLabel, emptyText, rows, onAdd, onOpen }: Props) {
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <section aria-label={title} className="rounded-3xl border border-border bg-surface">
      <div className="flex items-center gap-1 py-1 pr-1 pl-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpen((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-2xl px-2 py-2 text-left transition hover:bg-surface-muted"
        >
          <ChevronDownIcon className={`size-5 shrink-0 text-text-muted transition ${open ? '' : '-rotate-90'}`} />
          <h2 className="flex-1 font-semibold">{title}</h2>
          <span className="amount text-base">{formatRSD(total)}</span>
        </button>
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          className="grid size-10 shrink-0 place-items-center rounded-full text-primary transition hover:bg-primary-soft"
        >
          <PlusIcon className="size-5" />
        </button>
      </div>

      {open && (
        <div id={listId} className="border-t border-border">
          {rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-text-muted">{emptyText}</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(row.id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition last:rounded-b-3xl hover:bg-surface-muted"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate font-medium">{row.title}</span>
                      <span className="truncate text-xs text-text-muted">{row.subtitle}</span>
                    </span>
                    <span className={`amount text-base ${row.amount < 0 ? 'text-danger' : ''}`}>
                      {formatRSD(row.amount)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
