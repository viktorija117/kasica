import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

export const YEAR_PARAM = 'g'

function currentYear(): number {
  return new Date().getFullYear()
}

function yearFromParam(param: string | null): number | null {
  return param && /^\d{4}$/.test(param) ? Number(param) : null
}

/** The year shown on the Year screen, kept in the URL (`?g=2025`); the current one has no param. */
export function useSelectedYear(): [number, (year: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams()
  const year = yearFromParam(searchParams.get(YEAR_PARAM)) ?? currentYear()

  const setYear = useCallback(
    (next: number) => {
      setSearchParams(
        (params) => {
          if (next === currentYear()) params.delete(YEAR_PARAM)
          else params.set(YEAR_PARAM, String(next))
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  return [year, setYear]
}
