import type { ComponentType, SVGProps } from 'react'
import { NavLink, useLocation } from 'react-router'
import { sr } from '../i18n/sr'
import { CalendarIcon, HomeIcon, ListIcon, PlusIcon, SettingsIcon } from './icons'

type NavItem = {
  to: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  keepMonth?: boolean
}

const leftItems: NavItem[] = [
  { to: '/', label: sr.nav.home, Icon: HomeIcon, keepMonth: true },
  { to: '/troskovi', label: sr.nav.expenses, Icon: ListIcon, keepMonth: true },
]

const rightItems: NavItem[] = [
  { to: '/godina', label: sr.nav.year, Icon: CalendarIcon },
  { to: '/podesavanja', label: sr.nav.settings, Icon: SettingsIcon },
]

type Props = {
  onAdd: () => void
}

export function BottomNav({ onAdd }: Props) {
  return (
    <nav
      aria-label={sr.nav.label}
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
        {leftItems.map((item) => (
          <NavTab key={item.to} item={item} />
        ))}
        <li className="flex justify-center">
          <button
            type="button"
            onClick={onAdd}
            aria-label={sr.nav.add}
            className="-mt-8 grid size-16 place-items-center rounded-full bg-primary text-on-primary shadow-lg shadow-primary/30 ring-4 ring-bg transition hover:bg-primary-hover active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <PlusIcon width="30" height="30" />
          </button>
        </li>
        {rightItems.map((item) => (
          <NavTab key={item.to} item={item} />
        ))}
      </ul>
    </nav>
  )
}

function NavTab({ item }: { item: NavItem }) {
  const { search } = useLocation()
  const { to, label, Icon, keepMonth } = item

  return (
    <li>
      <NavLink
        to={{ pathname: to, search: keepMonth ? search : '' }}
        end
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium transition ${
            isActive ? 'text-primary' : 'text-text-muted hover:text-text'
          }`
        }
      >
        <Icon />
        <span>{label}</span>
      </NavLink>
    </li>
  )
}
