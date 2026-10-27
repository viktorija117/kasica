import { Button } from '../components/Button'
import { CategoryList } from '../components/CategoryList'
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
          <CategoryList categories={categories.data} />
        ) : (
          <QueryStatus error={categories.error} />
        )}
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
