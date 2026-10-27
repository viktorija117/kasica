// All user-facing text lives here so another language can be added later.

/** Serbian noun form for a count: 1 trošak, 2–4 troška, 5+ troškova (21 trošak, 12 troškova). */
function plural(n: number, one: string, few: string, many: string): string {
  const lastTwo = n % 100
  const last = n % 10
  if (lastTwo >= 11 && lastTwo <= 14) return many
  if (last === 1) return one
  if (last >= 2 && last <= 4) return few
  return many
}

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

  day: {
    today: 'Danas',
    yesterday: 'Juče',
  },

  sheet: {
    close: 'Zatvori',
  },

  necessity: {
    needed: 'Potrebno',
    unneeded: 'Bespotrebno',
  },

  expenseForm: {
    addTitle: 'Novi trošak',
    editTitle: 'Izmena troška',
    amount: 'Iznos',
    amountPlaceholder: '0',
    category: 'Kategorija',
    description: 'Opis',
    descriptionPlaceholder: 'npr. hleb, voda, struja',
    suggestions: 'Predlozi',
    date: 'Datum',
    necessity: 'Potrebno ili bespotrebno',
    paidBy: 'Ko je platio',
    note: 'Napomena',
    addNote: 'Dodaj napomenu',
    save: 'Sačuvaj',
    saveAndAdd: 'Sačuvaj i dodaj još',
    saveChanges: 'Sačuvaj izmene',
    delete: 'Obriši',
    saved: (what: string) => `✓ Sačuvano: ${what}`,
    errorAmount: 'Upiši iznos veći od nule, npr. 450 ili 69,99.',
    errorCategory: 'Izaberi kategoriju.',
    errorDate: 'Izaberi datum.',
    saveFailed: 'Trošak nije sačuvan. Proveri internet i pokušaj ponovo.',
  },

  toast: {
    undo: 'Poništi',
    dismiss: 'Zatvori poruku',
    expenseDeleted: 'Trošak je obrisan',
    incomeDeleted: 'Prihod je obrisan',
    savingDeleted: 'Štednja je obrisana',
    deleteFailed: 'Brisanje nije uspelo, trošak je vraćen.',
  },

  entryForm: {
    date: 'Datum',
    note: 'Napomena',
    save: 'Sačuvaj',
    saveChanges: 'Sačuvaj izmene',
    delete: 'Obriši',
    errorAmount: 'Upiši iznos veći od nule, npr. 70.000.',
    errorDate: 'Izaberi datum.',
  },

  income: {
    title: 'Prihodi',
    add: 'Dodaj prihod',
    addTitle: 'Novi prihod',
    editTitle: 'Izmena prihoda',
    source: 'Izvor',
    sourcePlaceholder: 'npr. plata, honorar',
    sourcePresets: ['Plata', 'Honorar', 'Poklon', 'Ostalo'],
    receivedBy: 'Ko je primio',
    empty: 'Nema prihoda ovog meseca.',
    errorSource: 'Upiši izvor prihoda, npr. Plata.',
    saveFailed: 'Prihod nije sačuvan. Proveri internet i pokušaj ponovo.',
  },

  saving: {
    title: 'Štednja',
    add: 'Dodaj štednju',
    addTitle: 'Štednja',
    editTitle: 'Izmena štednje',
    kind: 'Vrsta',
    deposit: 'Uplata',
    withdrawal: 'Podizanje',
    notePlaceholder: 'npr. za letovanje',
    empty: 'Nema štednje ovog meseca.',
    saveFailed: 'Štednja nije sačuvana. Proveri internet i pokušaj ponovo.',
  },

  carry: {
    adjust: 'Uskladi stanje',
    title: 'Uskladi stanje',
    intro: (month: string) =>
      `Koliko je stvarno preneto iz prethodnog meseca u ${month}? Ovaj iznos se pamti i koristi umesto izračunatog.`,
    amount: 'Preneto',
    automatic: (amount: string) => `Izračunato automatski: ${amount}`,
    save: 'Sačuvaj',
    reset: 'Vrati na automatski',
    adjusted: 'usklađeno ručno',
    toggle: 'Prenesi ostatak iz prošlog meseca',
    errorAmount: 'Upiši iznos, npr. 10.396 ili 0.',
    saveFailed: 'Podešavanje nije sačuvano. Proveri internet i pokušaj ponovo.',
  },

  home: {
    opening: 'Početno stanje',
    openingSplit: (carried: string, income: string) => `preneto ${carried} + prihodi ${income}`,
    spent: 'Potrošeno',
    saved: 'Ušteđeno',
    remaining: 'Preostalo',
    used: (pct: string) => `Iskorišćeno ${pct}`,
    today: 'Danas',
    avgPerDay: 'Prosečno dnevno',
    purchases: 'Broj kupovina',
    allowance: (amount: string, days: number) =>
      `Možeš da trošiš još ${amount} dnevno do kraja meseca (${days} ${plural(days, 'dan', 'dana', 'dana')}).`,
    overspent: 'Budžet za ovaj mesec je potrošen.',
    unneeded: 'Bespotrebno',
    unneededShare: (pct: string) => `${pct} potrošnje`,
    comparison: 'U odnosu na prošli mesec',
    comparisonSamePeriod: (day: number) => `isti period, 1–${day}.`,
    comparisonMore: (amount: string) => `${amount} više`,
    comparisonLess: (amount: string) => `${amount} manje`,
    comparisonSame: 'isto kao prošli mesec',
    comparisonNone: 'Prošli mesec nema troškova za poređenje.',
  },

  expenses: {
    title: 'Troškovi',
    empty: 'Još nema troškova za ovaj mesec.',
    noMatches: 'Nijedan trošak ne odgovara pretrazi i filterima.',
    search: 'Pretraga po opisu',
    searchPlaceholder: 'Pretraži opis…',
    filterCategory: 'Kategorija',
    filterNecessity: 'Potrebno ili bespotrebno',
    filterPaidBy: 'Ko je platio',
    allCategories: 'Sve kategorije',
    allNecessity: 'Sve',
    allMembers: 'Svi',
    nobody: 'Nije upisano',
    clearFilters: 'Poništi filtere',
    total: 'Ukupno',
    count: (n: number) => `${n} ${plural(n, 'trošak', 'troška', 'troškova')}`,
    unknownCategory: 'Nepoznata kategorija',
    noDescription: 'Bez opisa',
    paidBy: (name: string) => `platio/la ${name}`,
  },

  year: {
    title: 'Godina',
    placeholder: 'Godišnji pregled stiže uskoro.',
  },

  settings: {
    title: 'Podešavanja',
    household: 'Domaćinstvo',
    members: 'Članovi',
    you: 'ti',
    inviteCode: 'Kod za poziv',
    inviteHint: 'Pošalji ovaj kod partneru da se pridruži domaćinstvu.',
    copy: 'Kopiraj',
    copied: 'Kopirano',
    copyFailed: 'Kopiranje nije uspelo, prepiši kod ručno.',
    categories: 'Kategorije',
    archived: 'arhivirano',
    account: 'Nalog',
    signOut: 'Odjavi se',
  },

  loading: 'Učitavanje…',

  auth: {
    tagline: 'Zajednički kućni budžet',
    signIn: 'Prijava',
    signUp: 'Registracija',
    email: 'Email',
    password: 'Lozinka',
    passwordHint: 'Najmanje 6 znakova.',
    submitSignIn: 'Prijavi se',
    submitSignUp: 'Napravi nalog',
    checkEmail: 'Nalog je napravljen. Potvrdi email preko linka koji smo ti poslali, pa se prijavi.',
  },

  householdSetup: {
    title: 'Domaćinstvo',
    intro: 'Napravi novo domaćinstvo ili se pridruži postojećem kodom koji si dobio/la.',
    create: 'Napravi novo',
    join: 'Pridruži se kodom',
    name: 'Naziv domaćinstva',
    namePlaceholder: 'npr. Naša kuća',
    displayName: 'Tvoje ime',
    displayNamePlaceholder: 'npr. Viki',
    code: 'Kod za poziv',
    codePlaceholder: 'npr. K7M2QX9P',
    submitCreate: 'Napravi domaćinstvo',
    submitJoin: 'Pridruži se',
    signedInAs: 'Prijavljen/a kao',
  },

  errors: {
    retry: 'Pokušaj ponovo',
    generic: 'Nešto nije u redu. Pokušaj ponovo.',
    network: 'Nema veze sa serverom. Proveri internet i pokušaj ponovo.',
    invalidCredentials: 'Pogrešan email ili lozinka.',
    userExists: 'Nalog sa ovim emailom već postoji. Prijavi se.',
    weakPassword: 'Lozinka je preslaba. Koristi najmanje 6 znakova.',
    invalidEmail: 'Email adresa nije ispravna.',
    emailNotConfirmed: 'Email još nije potvrđen. Otvori link iz poruke koju smo ti poslali.',
    rateLimited: 'Previše pokušaja. Sačekaj malo pa pokušaj ponovo.',
    notAuthenticated: 'Prijava je istekla. Prijavi se ponovo.',
    alreadyMember: 'Već si član jednog domaćinstva.',
    invalidInviteCode: 'Kod nije ispravan. Proveri ga i pokušaj ponovo.',
    invalidHouseholdName: 'Upiši naziv domaćinstva (do 60 znakova).',
    invalidDisplayName: 'Upiši svoje ime (do 40 znakova).',
  },
} as const
