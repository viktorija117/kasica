import type { ReactNode } from 'react'
import { sr } from '../i18n/sr'

type Props = {
  subtitle: string
  children: ReactNode
}

/** Centered single-column layout for the screens before the app itself. */
export function AuthShell({ subtitle, children }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden="true"
          className="grid size-16 place-items-center rounded-3xl bg-primary-soft text-4xl"
        >
          🐷
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{sr.appName}</h1>
          <p className="mt-1 text-text-muted">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  )
}
