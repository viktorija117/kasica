import { useId, type ChangeEvent } from 'react'

type Props = {
  label: string
  disabled?: boolean
  onPick: (file: File) => void
}

/** A button-looking label for a hidden .xlsx file input. */
export function ImportFilePicker({ label, disabled, onPick }: Props) {
  const id = useId()
  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Clear it so picking the same file again still fires a change.
    event.target.value = ''
    if (file) onPick(file)
  }
  return (
    <>
      <input
        id={id}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <label
        htmlFor={id}
        aria-disabled={disabled || undefined}
        className="inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-primary px-5 font-semibold text-on-primary transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40 hover:bg-primary-hover active:scale-[0.98] aria-disabled:cursor-default aria-disabled:opacity-60"
      >
        {label}
      </label>
    </>
  )
}
