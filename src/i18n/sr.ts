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
