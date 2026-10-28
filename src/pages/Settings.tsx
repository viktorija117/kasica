import { Link } from 'react-router'
import { Button } from '../components/Button'
import { CategoryManager } from '../components/CategoryManager'
import { InviteCode } from '../components/InviteCode'
import { MembersList } from '../components/MembersList'
import { PageTitle } from '../components/PageTitle'
import { QueryStatus } from '../components/QueryStatus'
import { SettingsSection } from '../components/SettingsSection'
import { signOut } from '../data/auth'
import { useSession } from '../hooks/useAuth'
import { useCategories, useHousehold, useMembers } from '../hooks/useHousehold'
import { sr } from '../i18n/sr'

export function Settings() {
  const session = useSession()
  const household = useHousehold()
  const members = useMembers()
  const categories = useCategories()

  return (
    <>
      <PageTitle>{sr.settings.title}</PageTitle>

      <SettingsSection title={sr.settings.household}>
        <p className="text-lg font-semibold">{household.name}</p>
      </SettingsSection>

      <SettingsSection title={sr.settings.members}>
        {members.data ? (
          <MembersList members={members.data} currentUserId={session.user.id} />
        ) : (
          <QueryStatus error={members.error} />
        )}
      </SettingsSection>

      <SettingsSection title={sr.settings.inviteCode}>
        <InviteCode code={household.invite_code} />
      </SettingsSection>

      <SettingsSection title={sr.settings.categories}>
        {categories.data ? (
          <CategoryManager categories={categories.data} />
        ) : (
          <QueryStatus error={categories.error} />
        )}
      </SettingsSection>

      <SettingsSection title={sr.settings.import}>
        <p className="mb-3 text-sm text-text-muted">{sr.settings.importHint}</p>
        <Link
          to="/podesavanja/uvoz"
          className="inline-flex h-12 w-full items-center justify-center rounded-2xl border border-border bg-surface px-5 font-semibold text-text transition hover:bg-surface-muted active:scale-[0.98]"
        >
          {sr.settings.importOpen}
        </Link>
      </SettingsSection>

      <SettingsSection title={sr.settings.account}>
        <p className="mb-3 truncate text-sm text-text-muted">{session.user.email}</p>
        <Button variant="secondary" className="w-full" onClick={() => void signOut()}>
          {sr.settings.signOut}
        </Button>
      </SettingsSection>
    </>
  )
}
