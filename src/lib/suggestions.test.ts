import { findExactSuggestion, matchSuggestions } from './suggestions'

const history = [
  { description: 'Mineralna voda', uses: 2, last_date: '2026-10-20' },
  { description: 'voda', uses: 12, last_date: '2026-10-26' },
  { description: 'Vodoinstalater', uses: 1, last_date: '2026-09-02' },
  { description: 'Votka', uses: 3, last_date: '2026-10-01' },
  { description: 'Ćevapi', uses: 4, last_date: '2026-10-11' },
  { description: 'Hleb', uses: 30, last_date: '2026-10-27' },
]

const descriptions = (typed: string) => matchSuggestions(history, typed).map((s) => s.description)

describe('matchSuggestions', () => {
  it('puts descriptions that start with the text first, most used first', () => {
    expect(descriptions('vo')).toEqual(['voda', 'Votka', 'Vodoinstalater', 'Mineralna voda'])
  })

  it('ignores case and Serbian diacritics', () => {
    expect(descriptions('CEV')).toEqual(['Ćevapi'])
    expect(descriptions('ćev')).toEqual(['Ćevapi'])
  })

  it('suggests nothing for an empty field', () => {
    expect(descriptions('')).toEqual([])
    expect(descriptions('   ')).toEqual([])
  })

  it('hides the list once the text matches a description exactly', () => {
    expect(descriptions('Voda ')).toEqual([])
  })

  it('respects the limit', () => {
    expect(matchSuggestions(history, 'o', 2)).toHaveLength(2)
  })

  it('breaks ties by the most recent use', () => {
    const tied = [
      { description: 'sok A', uses: 1, last_date: '2026-10-01' },
      { description: 'sok B', uses: 1, last_date: '2026-10-09' },
    ]
    expect(matchSuggestions(tied, 'sok').map((s) => s.description)).toEqual(['sok B', 'sok A'])
  })
})

describe('findExactSuggestion', () => {
  it('finds a description regardless of case and diacritics', () => {
    expect(findExactSuggestion(history, ' VODA')?.description).toBe('voda')
    expect(findExactSuggestion(history, 'cevapi')?.description).toBe('Ćevapi')
    expect(findExactSuggestion(history, 'vod')).toBeUndefined()
    expect(findExactSuggestion(history, '')).toBeUndefined()
  })
})
