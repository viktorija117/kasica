import { PageTitle } from '../components/PageTitle'
import { sr } from '../i18n/sr'

export function Year() {
  return (
    <>
      <PageTitle>{sr.year.title}</PageTitle>
      <p className="text-text-muted">{sr.year.placeholder}</p>
    </>
  )
}
