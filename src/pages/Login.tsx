import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { AuthShell } from '../components/AuthShell'
import { Button } from '../components/Button'
import { FormMessage } from '../components/FormMessage'
import { SegmentedControl } from '../components/SegmentedControl'
import { TextField } from '../components/TextField'
import { signIn, signUp } from '../data/auth'
import { sr } from '../i18n/sr'
import { errorMessage } from '../lib/errors'

type Mode = 'signIn' | 'signUp'

const modeOptions: { value: Mode; label: string }[] = [
  { value: 'signIn', label: sr.auth.signIn },
  { value: 'signUp', label: sr.auth.signUp },
]

async function submitCredentials(mode: Mode, email: string, password: string) {
  if (mode === 'signUp') return signUp(email, password)
  await signIn(email, password)
  return { needsConfirmation: false }
}

export function Login() {
  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // A successful sign-in changes the session, and GuestOnly then redirects into the app.
  const mutation = useMutation({
    mutationFn: () => submitCredentials(mode, email.trim(), password),
  })

  const changeMode = (next: Mode) => {
    setMode(next)
    mutation.reset()
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutation.mutate()
  }

  const isSignUp = mode === 'signUp'

  return (
    <AuthShell subtitle={sr.auth.tagline}>
      <SegmentedControl value={mode} options={modeOptions} onChange={changeMode} />

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <TextField
          label={sr.auth.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label={sr.auth.password}
          type="password"
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          minLength={6}
          required
          hint={isSignUp ? sr.auth.passwordHint : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />

        {mutation.isError && <FormMessage tone="error">{errorMessage(mutation.error)}</FormMessage>}
        {mutation.data?.needsConfirmation && (
          <FormMessage tone="info">{sr.auth.checkEmail}</FormMessage>
        )}

        <Button type="submit" loading={mutation.isPending} className="mt-2">
          {isSignUp ? sr.auth.submitSignUp : sr.auth.submitSignIn}
        </Button>
      </form>
    </AuthShell>
  )
}
