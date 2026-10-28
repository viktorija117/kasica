// A fiscal receipt as suf.purs.gov.rs serves it, for the receipt tests.
// Modelled on real receipts: Cyrillic labels, a 0,512 kg item, a discount line and two tax rates.

export const RECEIPT_URL =
  'https://suf.purs.gov.rs/v/?vl=A1hFSjJGS1pBWEVKMkZLWkGQBgAAhwYAAEBXUAAAAAAAAAABjQ%2B9kDsAAAA%3D'

export const RECEIPT_JOURNAL = `============ ФИСКАЛНИ РАЧУН ============
ПИБ:                           100002012
Предузеће:           DELHAIZE SERBIA DOO
Место продаје:                  Maxi 241
Адреса:              Булевар ослобођења 1
Град:                            Београд
Касир:                             Ана П
ЕСИР број:                       161/2.0
-------------ПРОМЕТ ПРОДАЈА-------------
Артикли
========================================
Назив   Цена         Кол.         Укупно
Хлеб бели 500г /KOM (Е)
               89,99          2       179,98
Banane /KG (Е)
              169,99      0,512        87,03
Čokolada Milka mlečna 100g sa
lešnicima /KOM (Ђ)
              219,99          1       219,99
Popust Milka (Ђ)
              -20,00          1       -20,00
Deterdžent za sudove 1l /KOM (Ђ)
            1.249,99          1     1.249,99
----------------------------------------
Укупан износ:                   1.716,99
Платна картица:                 1.716,99
========================================
Ознака       Име      Стопа        Порез
Е           П-ПДВ   10,00%         24,27
Ђ           О-ПДВ   20,00%        241,66
----------------------------------------
Укупан износ пореза:              265,93
========================================
ПФР време:          28.10.2026. 14:32:11
ПФР број рачуна: XEJ2FKZA-XEJ2FKZA-1680
Бројач рачуна:             1616/1680ПП
========================================`

export const RECEIPT_SPECIFICATIONS = {
  success: true,
  items: [
    { gtin: '8600000000011', name: 'Хлеб бели 500г/KOM', quantity: 2, total: 179.98, unitPrice: 89.99, label: 'Е', labelRate: 10, taxBaseAmount: 163.62, vatAmount: 16.36 },
    { gtin: '2000000000015', name: 'Banane/KG', quantity: 0.512, total: 87.03, unitPrice: 169.99, label: 'Е', labelRate: 10, taxBaseAmount: 79.12, vatAmount: 7.91 },
    { gtin: '7622210000000', name: 'Čokolada Milka mlečna 100g sa lešnicima/KOM', quantity: 1, total: 219.99, unitPrice: 219.99, label: 'Ђ', labelRate: 20, taxBaseAmount: 183.33, vatAmount: 36.66 },
    { gtin: '', name: 'Popust Milka', quantity: 1, total: -20, unitPrice: -20, label: 'Ђ', labelRate: 20, taxBaseAmount: -16.67, vatAmount: -3.33 },
    { gtin: '3800000000000', name: 'Deterdžent za sudove 1l/KOM', quantity: 1, total: 1249.99, unitPrice: 1249.99, label: 'Ђ', labelRate: 20, taxBaseAmount: 1041.66, vatAmount: 208.33 },
  ],
}

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The verification page, trimmed down to the parts that are read. */
export function receiptHtml({
  shop = '1013251-Maxi 241',
  total = '1.716,99',
  time = '28.10.2026. 14:32:11',
  journal = RECEIPT_JOURNAL,
} = {}): string {
  return `<!DOCTYPE html>
<html lang="sr-Cyrl-RS"><head><title>Провера рачуна</title></head>
<body>
  <form>
    <div class="form-group"><label>Назив продајног места</label>
      <span id="shopFullNameLabel" class="form-control">${escapeHtml(shop)}</span></div>
    <div class="form-group"><label>Укупан износ</label>
      <span id="totalAmountLabel" class="form-control">${total}</span></div>
    <div class="form-group"><label>ПФР време (временска зона сервера)</label>
      <span id="sdcDateTimeLabel" class="form-control">${time}</span></div>
    <div class="form-group"><label>Затражио - Потписао - Бројач</label>
      <span id="invoiceNumberLabel" class="form-control">XEJ2FKZA-XEJ2FKZA-1680</span></div>
  </form>
  <pre style="font-family: monospace">${escapeHtml(journal)}</pre>
  <script>viewModel.InvoiceNumber('XEJ2FKZA-XEJ2FKZA-1680'); viewModel.Token('6d1b0a6e-0000-4000-8000-000000000000');</script>
</body></html>`
}
