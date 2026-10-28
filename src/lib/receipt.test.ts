import { RECEIPT_JOURNAL, RECEIPT_SPECIFICATIONS, RECEIPT_URL, receiptHtml } from '../test/receiptFixtures'
import { sumAmounts } from './budget'
import {
  normalizeReceiptUrl,
  parseJournal,
  parseReceiptNumber,
  parseReceiptPage,
  parseSpecifications,
  readReceipt,
  toLatin,
} from './receipt'

const VL = 'A1hFSjJGS1pBWEVKMkZLWkGQBgAAhwYAAEBXUAAAAAAAAAABjQ+9kDsAAAA='

describe('normalizeReceiptUrl', () => {
  it('accepts the link from the QR code', () => {
    expect(normalizeReceiptUrl(RECEIPT_URL)).toBe(RECEIPT_URL)
  })

  it('gives one spelling for the same receipt', () => {
    const variants = [
      `https://suf.purs.gov.rs/v/?vl=${VL}`,
      `  http://SUF.PURS.GOV.RS/v?vl=${encodeURIComponent(VL)}  `,
      `suf.purs.gov.rs/v/?vl=${encodeURIComponent(VL)}&lang=sr`,
      `Pogledaj račun: https://suf.purs.gov.rs/v/?vl=${encodeURIComponent(VL)}`,
    ]
    for (const variant of variants) expect(normalizeReceiptUrl(variant)).toBe(RECEIPT_URL)
  })

  it('keeps the + of base64 instead of turning it into a space', () => {
    expect(normalizeReceiptUrl(`https://suf.purs.gov.rs/v/?vl=${VL}`)).toContain('%2B')
  })

  it('rejects other sites and links without a receipt', () => {
    expect(normalizeReceiptUrl(`https://suf.purs.gov.rs.evil.com/v/?vl=${VL}`)).toBeNull()
    expect(normalizeReceiptUrl(`https://example.com/?u=suf.purs.gov.rs/x/?vl=${VL}`)).toBeNull()
    expect(normalizeReceiptUrl('https://suf.purs.gov.rs/v/?vl=')).toBeNull()
    expect(normalizeReceiptUrl('https://suf.purs.gov.rs/v/?vl=<script>alert(1)</script>xxxxxxxxxxxx')).toBeNull()
    expect(normalizeReceiptUrl('https://suf.purs.gov.rs/')).toBeNull()
    expect(normalizeReceiptUrl('1234567890')).toBeNull()
  })
})

describe('toLatin', () => {
  it('transliterates Serbian Cyrillic', () => {
    expect(toLatin('Хлеб бели, ђевреци и џем')).toBe('Hleb beli, đevreci i džem')
    expect(toLatin('Љубовија ЉУТО Њ')).toBe('Ljubovija LJUTO Nj')
    expect(toLatin('Milka 100g')).toBe('Milka 100g')
  })
})

describe('parseReceiptNumber', () => {
  it('reads receipt numbers', () => {
    expect(parseReceiptNumber('1.249,99')).toBe(1249.99)
    expect(parseReceiptNumber('0,512')).toBe(0.512)
    expect(parseReceiptNumber('-20,00')).toBe(-20)
    expect(parseReceiptNumber('2')).toBe(2)
    expect(parseReceiptNumber('12.345.678,90')).toBe(12345678.9)
    expect(parseReceiptNumber('')).toBeNull()
    expect(parseReceiptNumber('abc')).toBeNull()
  })
})

describe('parseJournal', () => {
  it('reads every item with its quantity, unit price, total and tax label', () => {
    expect(parseJournal(RECEIPT_JOURNAL)).toEqual([
      { name: 'Hleb beli 500g', quantity: 2, unitPrice: 89.99, total: 179.98, taxLabel: 'Е' },
      { name: 'Banane', quantity: 0.512, unitPrice: 169.99, total: 87.03, taxLabel: 'Е' },
      { name: 'Čokolada Milka mlečna 100g sa lešnicima', quantity: 1, unitPrice: 219.99, total: 219.99, taxLabel: 'Ђ' },
      { name: 'Popust Milka', quantity: 1, unitPrice: -20, total: -20, taxLabel: 'Ђ' },
      { name: 'Deterdžent za sudove 1l', quantity: 1, unitPrice: 1249.99, total: 1249.99, taxLabel: 'Ђ' },
    ])
  })

  it('stops at the total and ignores the tax table', () => {
    const names = parseJournal(RECEIPT_JOURNAL).map((item) => item.name)
    expect(names.some((name) => /PDV|iznos/i.test(name))).toBe(false)
  })

  it('reads a receipt printed in Latin script', () => {
    const latin = `Naziv   Cena         Kol.         Ukupno
Mleko 2,8% 1l (E)
              139,99          3       419,97
----------------------------------------
Ukupan iznos:                     419,97`
    expect(parseJournal(latin)).toEqual([
      { name: 'Mleko 2,8% 1l', quantity: 3, unitPrice: 139.99, total: 419.97, taxLabel: 'E' },
    ])
  })

  it('returns nothing for text that is not a receipt', () => {
    expect(parseJournal('')).toEqual([])
    expect(parseJournal('Рачун није пронађен')).toEqual([])
  })
})

describe('parseSpecifications', () => {
  it('reads the items request', () => {
    const items = parseSpecifications(RECEIPT_SPECIFICATIONS)
    expect(items).toHaveLength(5)
    expect(items?.[0]).toEqual({ name: 'Hleb beli 500g', quantity: 2, unitPrice: 89.99, total: 179.98, taxLabel: 'Е' })
    expect(items?.[1]).toMatchObject({ name: 'Banane', quantity: 0.512, total: 87.03 })
  })

  it('accepts numbers sent as text', () => {
    const items = parseSpecifications({
      success: true,
      items: [{ name: 'Jabuke/KG', quantity: '1,250', unitPrice: '99,99', total: '124,99', label: 'Е' }],
    })
    expect(items).toEqual([{ name: 'Jabuke', quantity: 1.25, unitPrice: 99.99, total: 124.99, taxLabel: 'Е' }])
  })

  it('returns null for a failed or unknown answer', () => {
    expect(parseSpecifications({ success: false })).toBeNull()
    expect(parseSpecifications(null)).toBeNull()
    expect(parseSpecifications('<html>')).toBeNull()
    expect(parseSpecifications({ success: true, items: 'x' })).toBeNull()
  })
})

describe('parseReceiptPage', () => {
  it('reads the shop, date, total and invoice number', () => {
    const page = parseReceiptPage(receiptHtml())
    expect(page).toMatchObject({
      store: 'Maxi 241',
      date: '2026-10-28',
      total: 1716.99,
      invoiceNumber: 'XEJ2FKZA-XEJ2FKZA-1680',
    })
    expect(page.journal).toContain('ФИСКАЛНИ РАЧУН')
  })

  it('transliterates a Cyrillic shop name and pads the date', () => {
    const page = parseReceiptPage(receiptHtml({ shop: '1200345-Пекара Ђорђе', time: '1.2.2026. 7:05:00' }))
    expect(page.store).toBe('Pekara Đorđe')
    expect(page.date).toBe('2026-02-01')
  })

  it('falls back to the printed receipt for a missing shop or total', () => {
    const page = parseReceiptPage(receiptHtml({ shop: '', total: '' }))
    expect(page.store).toBe('DELHAIZE SERBIA DOO')
    expect(page.total).toBe(1716.99)
  })
})

describe('readReceipt', () => {
  it('uses the items request and folds the discount into the item above it', () => {
    const receipt = readReceipt({ html: receiptHtml(), specifications: RECEIPT_SPECIFICATIONS })
    expect(receipt.items.map((item) => [item.name, item.total])).toEqual([
      ['Hleb beli 500g', 179.98],
      ['Banane', 87.03],
      ['Čokolada Milka mlečna 100g sa lešnicima', 199.99],
      ['Deterdžent za sudove 1l', 1249.99],
    ])
  })

  it('reads the printed receipt when the items request failed', () => {
    const receipt = readReceipt({ html: receiptHtml(), specifications: { success: false } })
    expect(receipt.items).toHaveLength(4)
    expect(receipt.items[2]).toMatchObject({ name: 'Čokolada Milka mlečna 100g sa lešnicima', total: 199.99 })
  })

  it('keeps the items sum equal to the receipt total across tax rates', () => {
    const receipt = readReceipt({ html: receiptHtml(), specifications: RECEIPT_SPECIFICATIONS })
    expect(new Set(receipt.items.map((item) => item.taxLabel))).toEqual(new Set(['Е', 'Ђ']))
    expect(sumAmounts(receipt.items.map((item) => ({ amount: item.total })))).toBe(receipt.total)
  })
})
