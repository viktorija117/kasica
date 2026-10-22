import { PageTitle } from '../components/PageTitle'
import { sr } from '../i18n/sr'

export function Settings() {
  return (
    <>
      <PageTitle>{sr.settings.title}</PageTitle>
      <p className="text-text-muted">{sr.settings.placeholder}</p>
    </>
  )
}
