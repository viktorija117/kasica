import { sr } from '../i18n/sr'

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-border/60 bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        <span
          aria-hidden="true"
          className="grid size-8 place-items-center rounded-xl bg-primary-soft text-lg"
        >
          🐷
        </span>
        <span className="text-lg font-bold tracking-tight">{sr.appName}</span>
      </div>
    </header>
  )
}
