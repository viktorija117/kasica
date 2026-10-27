import type { ReactNode } from 'react'

type Props = {
  title: string
  children: ReactNode
}

export function SettingsSection({ title, children }: Props) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-sm font-semibold tracking-wide text-text-muted uppercase">
        {title}
      </h2>
      <div className="rounded-3xl border border-border bg-surface p-4">{children}</div>
    </section>
  )
}
