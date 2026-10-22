// All user-facing text lives here so another language can be added later.
export const sr = {
  appName: 'Kasica',
  currency: 'RSD',

  nav: {
    label: 'Glavna navigacija',
    home: 'Početna',
    expenses: 'Troškovi',
    add: 'Dodaj trošak',
    year: 'Godina',
    settings: 'Podešavanja',
  },

  month: {
    previous: 'Prethodni mesec',
    next: 'Sledeći mesec',
    current: 'Ovaj mesec',
    names: [
      'Januar',
      'Februar',
      'Mart',
      'April',
      'Maj',
      'Jun',
      'Jul',
      'Avgust',
      'Septembar',
      'Oktobar',
      'Novembar',
      'Decembar',
    ],
  },

  sheet: {
    close: 'Zatvori',
    addExpenseTitle: 'Novi trošak',
    addExpenseComingSoon: 'Ovde će uskoro biti unos troška.',
  },

  home: {
    remaining: 'Preostalo',
    placeholder: 'Pregled meseca stiže kada povežemo podatke.',
  },

  expenses: {
    title: 'Troškovi',
    empty: 'Još nema troškova za ovaj mesec.',
  },

  year: {
    title: 'Godina',
    placeholder: 'Godišnji pregled stiže uskoro.',
  },

  settings: {
    title: 'Podešavanja',
    placeholder: 'Kategorije, domaćinstvo i uvoz stižu uskoro.',
  },
} as const
