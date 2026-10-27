type Props = {
  tone: 'error' | 'info'
  children: string
}

const tones = {
  error: 'bg-danger-soft text-danger',
  info: 'bg-primary-soft text-primary',
}

export function FormMessage({ tone, children }: Props) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={`rounded-2xl px-4 py-3 text-sm ${tones[tone]}`}
    >
      {children}
    </p>
  )
}
