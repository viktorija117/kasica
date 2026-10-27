import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/Button'
import { FormMessage } from '../components/FormMessage'
import { SegmentedControl } from '../components/SegmentedControl'
import { TextField } from '../components/TextField'
import { signOut } from '../data/auth'
import { createHousehold, joinHousehold } from '../data/households'
import { useSession } from '../hooks/useAuth'
import { sr } from '../i18n/sr'
import { errorMessage } from '../lib/errors'
import { queryKeys } from '../lib/queryKeys'

type Mode = 'create' | 'join'

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'create', label: sr.householdSetup.create },
  { value: 'join', label: sr.householdSetup.join },
]

export function HouseholdSetup() {
  const session = useSession()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<Mode>('create')
  const [householdName, setHouseholdName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [code, setCode] = useState('')

  // Once the household query refetches with data, RequireNoHousehold redirects home.
  const mutation = useMutation({
    mutationFn: () =>
      mode === 'create'
        ? createHousehold(householdName.trim(), displayName.trim())
        : joinHousehold(code, displayName.trim()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.household(session.user.id) }),
  })

  const changeMode = (next: Mode) => {
    setMode(next)
    mutation.reset()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  return (
    <AuthShell subtitle={sr.householdSetup.intro}>
      <SegmentedControl value={mode} options={modeOptions} onChange={changeMode} />

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        {mode === 'create' ? (
          <TextField
            label={sr.householdSetup.name}
            placeholder={sr.householdSetup.namePlaceholder}
            maxLength={60}
            required
            value={householdName}
            onChange={(event) => setHouseholdName(event.target.value)}
          />
        ) : (
          <TextField
            label={sr.householdSetup.code}
            placeholder={sr.householdSetup.codePlaceholder}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            required
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            className="[&_input]:font-mono [&_input]:tracking-widest"
          />
        )}
        <TextField
          label={sr.householdSetup.displayName}
          placeholder={sr.householdSetup.displayNamePlaceholder}
          autoComplete="given-name"
          maxLength={40}
          required
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />

        {mutation.isError && <FormMessage tone="error">{errorMessage(mutation.error)}</FormMessage>}

        <Button type="submit" loading={mutation.isPending} className="mt-2">
          {mode === 'create' ? sr.householdSetup.submitCreate : sr.householdSetup.submitJoin}
        </Button>
      </form>

      <div className="mt-8 flex flex-col items-center gap-1 text-sm text-text-muted">
        <span>
          {sr.householdSetup.signedInAs} {session.user.email}
        </span>
        <Button variant="ghost" className="h-10" onClick={() => void signOut()}>
          {sr.settings.signOut}
        </Button>
      </div>
    </AuthShell>
  )
}
