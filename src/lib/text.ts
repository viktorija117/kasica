// Serbian Latin letters with diacritics and their plain-keyboard spelling, so "cevapi"
// finds "ćevapi" and "dj" finds "đ".
const plainLetters: Record<string, string> = {
  č: 'c',
  ć: 'c',
  š: 's',
  ž: 'z',
  đ: 'dj',
}

/** Lower-case, trimmed text without Serbian diacritics, for searching. */
export function searchKey(text: string): string {
  return text
    .trim()
    .toLocaleLowerCase('sr-Latn')
    .replace(/[čćšžđ]/g, (letter) => plainLetters[letter])
    .replace(/\s+/g, ' ')
}
