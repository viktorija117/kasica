// Reading Serbian fiscal receipts.
//
// The QR code of every fiscal receipt is a link to the tax office's verification page:
//   https://suf.purs.gov.rs/v/?vl=<base64>
// That page has the shop, the total and the time in elements with fixed ids
// (shopFullNameLabel, totalAmountLabel, sdcDateTimeLabel, invoiceNumberLabel) and the whole
// printed receipt (the "journal") in a <pre>. The items come from a second request,
// POST /specifications, as JSON: { success, items: [{ name, quantity, unitPrice, total, label,
// labelRate, ... }] }. The `fiscal-receipt` Edge Function fetches both (the site does not allow
// browsers to read it directly) and everything is read here.

import { foldDiscounts, roundMoney } from './budget'
import type { DateKey } from './dates'

export const RECEIPT_HOST = 'suf.purs.gov.rs'

/** What the `fiscal-receipt` Edge Function returns: the page and the items request, unread. */
export type RawReceipt = {
  html: string
  /** The JSON of POST /specifications, or null when that request failed. */
  specifications: unknown
}

export type ReceiptItem = {
  name: string
  quantity: number
  unitPrice: number
  /** What the item cost on this receipt (quantity × unit price, after discounts). */
  total: number
  /** Tax label printed next to the item (Ђ = 20%, Е = 10%, …). */
  taxLabel: string
}

export type ParsedReceipt = {
  store: string
  date: DateKey | null
  total: number | null
  invoiceNumber: string | null
  items: ReceiptItem[]
}

// --- link ----------------------------------------------------------------------------------

/**
 * The verification link in `text` (a scanned QR code or a pasted link), in one fixed spelling so
 * the same receipt always gives the same link. Null when it is not a fiscal receipt link.
 */
export function normalizeReceiptUrl(text: string): string | null {
  const link = text.match(/(?:https?:\/\/)?suf\.purs\.gov\.rs\/v\/?\?(\S+)/i)
  if (!link) return null
  const raw = link[1].match(/(?:^|&)vl=([^&#]+)/)?.[1]
  if (!raw) return null
  let vl: string
  try {
    // Not URLSearchParams: it would turn the `+` of base64 into a space.
    vl = decodeURIComponent(raw)
  } catch {
    return null
  }
  if (!/^[A-Za-z0-9+/=_-]{20,}$/.test(vl)) return null
  return `https://${RECEIPT_HOST}/v/?vl=${encodeURIComponent(vl)}`
}

// --- text ----------------------------------------------------------------------------------

const cyrillicToLatin: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ђ: 'đ', е: 'e', ж: 'ž', з: 'z', и: 'i', ј: 'j',
  к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  ћ: 'ć', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'č', џ: 'dž', ш: 'š',
}

/** Serbian Cyrillic to Latin script: "Хлеб Љубовија" → "Hleb Ljubovija", "ЉУТО" → "LJUTO". */
export function toLatin(text: string): string {
  return text.replace(/[Ѐ-ӿ]/g, (letter, index: number) => {
    const lower = letter.toLowerCase()
    const latin = cyrillicToLatin[lower]
    if (latin === undefined) return letter
    if (letter === lower) return latin
    const next = text[index + 1] ?? ''
    const nextIsUpper = next !== next.toLowerCase()
    return nextIsUpper ? latin.toUpperCase() : latin[0].toUpperCase() + latin.slice(1)
  })
}

/**
 * Numbers as printed on receipts: `1.234,56`, `0,512`, `-50,00`. Unlike `parseAmount` it allows
 * three decimals, which quantities in kilograms have.
 */
export function parseReceiptNumber(text: string): number | null {
  const compact = text.replace(/\s/g, '')
  if (!/^-?[\d.,]*\d$/.test(compact)) return null
  const plain = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact
  const value = Number(plain)
  return Number.isFinite(value) ? value : null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'string') return parseReceiptNumber(value)
  return null
}

const TAX_LABEL = /\s*\(([A-ZА-ЯЂЈЉЊЋЏ]{1,2})\)\s*$/u
// Unit of measure some shops glue to the name: "Banane/KG", "Hleb 500g /KOM".
const UNIT_SUFFIX = /\s*\/\s*(?:kom|kg|g|l|ml|pak|kut|m|m2|fl|ком|кг|г|л|мл|пак|кут|м)\.?\s*$/iu

function cleanItemName(name: string): string {
  return toLatin(name.replace(TAX_LABEL, '').replace(UNIT_SUFFIX, ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

/** "1013251-Maxi 241" → "Maxi 241": the shop name starts with its number in the tax registry. */
function cleanStore(name: string): string {
  return toLatin(name.replace(/^\s*\d+\s*-\s*/, ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

/** "29.12.2026. 12:32:47" → "2026-12-29". */
function parseReceiptDate(text: string): DateKey | null {
  const local = text.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/)
  if (local) return `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}`
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : null
}

// --- journal (the printed receipt) ---------------------------------------------------------

const ITEM_NUMBERS = /^\s*(-?[\d.]*\d,\d{2})\s+(-?[\d.]*\d(?:,\d+)?)\s+(-?[\d.]*\d,\d{2})\s*$/
const ITEMS_HEADER = /(Назив|Naziv).*(Укупно|Ukupno)/
const ITEMS_END = /^\s*-{5,}|Укупан износ|Ukupan iznos/

/**
 * Items of the printed receipt. Each item is its name (one or more lines, ending with the tax
 * label) followed by a line with unit price, quantity and total:
 *   Banane /KG (Е)
 *                169,99      0,512        87,03
 */
export function parseJournal(journal: string): ReceiptItem[] {
  const lines = journal.split(/\r?\n/)
  const start = lines.findIndex((line) => ITEMS_HEADER.test(line))
  if (start < 0) return []

  const items: ReceiptItem[] = []
  let nameLines: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (ITEMS_END.test(line)) break
    const numbers = line.match(ITEM_NUMBERS)
    if (numbers && nameLines.length > 0) {
      const name = nameLines.join(' ')
      items.push({
        name: cleanItemName(name),
        unitPrice: parseReceiptNumber(numbers[1]) ?? 0,
        quantity: parseReceiptNumber(numbers[2]) ?? 0,
        total: parseReceiptNumber(numbers[3]) ?? 0,
        taxLabel: name.match(TAX_LABEL)?.[1] ?? '',
      })
      nameLines = []
    } else if (!/^[\s=]*$/.test(line)) {
      nameLines.push(line.trim())
    }
  }
  return items
}

/** "Укупан износ:   1.234,56" of the printed receipt. */
function journalTotal(journal: string): number | null {
  const line = journal.match(/(?:Укупан износ|Ukupan iznos)\s*:\s*(-?[\d.,]+)/)
  return line ? parseReceiptNumber(line[1]) : null
}

/** "Предузеће:   DELHAIZE SERBIA" of the printed receipt. */
function journalCompany(journal: string): string {
  return journal.match(/(?:Предузеће|Preduzeće)\s*:\s*(.+)/)?.[1] ?? ''
}

// --- page and items request ----------------------------------------------------------------

/** Items from the JSON of POST /specifications; null when it is not a successful answer. */
export function parseSpecifications(value: unknown): ReceiptItem[] | null {
  if (typeof value !== 'object' || value === null) return null
  const { success, items } = value as { success?: unknown; items?: unknown }
  if (success !== true || !Array.isArray(items)) return null

  return items.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const { name, quantity, unitPrice, total, label } = item as Record<string, unknown>
    const amount = toNumber(total)
    if (amount === null) return []
    return [
      {
        name: cleanItemName(String(name ?? '')),
        quantity: toNumber(quantity) ?? 1,
        unitPrice: toNumber(unitPrice) ?? amount,
        total: amount,
        taxLabel: typeof label === 'string' ? label : '',
      },
    ]
  })
}

type ReceiptPage = Omit<ParsedReceipt, 'items'> & { journal: string }

export function parseReceiptPage(html: string): ReceiptPage {
  const page = new DOMParser().parseFromString(html, 'text/html')
  const field = (id: string) => page.getElementById(id)?.textContent?.trim() ?? ''
  const journal = page.querySelector('pre')?.textContent ?? ''
  const total = parseReceiptNumber(field('totalAmountLabel')) ?? journalTotal(journal)

  return {
    store: cleanStore(field('shopFullNameLabel') || journalCompany(journal)),
    date: parseReceiptDate(field('sdcDateTimeLabel')),
    total: total === null ? null : roundMoney(total),
    invoiceNumber: field('invoiceNumberLabel') || null,
    journal,
  }
}

/**
 * Everything the review screen needs from a fetched receipt. Items come from the items request,
 * or from the printed receipt when that request failed; discount lines are folded into the
 * items they belong to.
 */
export function readReceipt(raw: RawReceipt): ParsedReceipt {
  const { journal, ...page } = parseReceiptPage(raw.html)
  const fromRequest = parseSpecifications(raw.specifications)
  const items = fromRequest && fromRequest.length > 0 ? fromRequest : parseJournal(journal)
  return { ...page, items: foldDiscounts(items) }
}
