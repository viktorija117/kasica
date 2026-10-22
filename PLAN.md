# Kasica — plan i program izrade

Aplikacija za zajednički kućni budžet za tebe i dečka. Zamenjuje Excel „Budžet kućni“: radi sve
što radi on, ali tačno, brže na telefonu i lepše. Instalira se na Android kao prava aplikacija,
radi i na laptopu, a oboje vidite iste podatke u istom trenutku.

**Kako koristiš ovaj plan:** radi fazu po fazu. Za svaku fazu otvoriš Claude u terminalu u folderu
projekta i nalepiš poruku iz odeljka „Poruka za Claude“. Faza je gotova kad su ispunjene sve
stavke iz „Gotovo kada“. Posle svake faze napravi commit i push na GitHub.

---

## 1. Šta sam našla u Excelu

**Kako ga koristite:** 586 kupovina od 1. avgusta do 22. oktobra 2026, oko 200 mesečno.
Svaka kupovina ima datum, kategoriju, opis, iznos i oznaku „Potrebno / Bespotrebno“.
Prihode upisujete kao zbir u „Godišnjem pregledu“ (npr. `=SUM(70000; 32970; …)`), a ostatak
novca prebacujete u sledeći mesec preko posebne kategorije „Prebacivanje u sledeći mesec“.

| Mesec | Početno stanje | Stvarno potrošeno* | Bespotrebno | Najviše na |
|---|---|---|---|---|
| Avgust | 302.817 | 190.521 | 32.016 (17%) | Računi |
| Septembar | 232.856 | 196.724 | 24.252 (12%) | Ostalo |
| Oktobar (do 22.) | 249.982 | 175.990 | 17.009 (10%) | Računi |

\* bez „Prebacivanja u sledeći mesec“, jer to nije trošak.

**Greške u formulama** (aplikacija ih neće imati):
1. **„Lična higijena“ se ne računa u Godišnjem pregledu** osim za avgust. Za januar formula
   gleda pogrešnu kolonu, a za ostale mesece je nema.
2. **U redu UKUPNO fale zbirovi** za „Brza hrana…“ i „Lična higijena“, pa je i „Najveća kategorija
   u godini“ pogrešna.
3. **„Putovanja“ ne postoji u padajućoj listi** ni u izveštajima, jer lista ide samo do 13. reda
   lista Kategorije.
4. **Prebacivanje se računa kao potrošnja.** Septembar pokazuje 232.856 potrošeno, a stvarno je
   196.724. Takođe, u Pregledu se „UKUPNO“ po kategorijama ne slaže sa „POTROŠENO“.
5. **Avgust se ne zatvara:** prebačeno je 10.396, a po računici je ostalo 37.096. Razlika od
   26.700 nije nigde zapisana.
6. Jedna kupovina nema iznos (23.9. „Sredstvo za otpušavanje za Dragicu“).
7. „Ostalo“ je u septembru bila najveća kategorija (55.433), jer u nju idu telefon, pokloni,
   pretplate i papirologija. Zato aplikacija predlaže još par kategorija (dole).

---

## 2. Šta aplikacija radi

Donja navigacija: **Početna · Troškovi · [ + ] · Godina · Podešavanja**

| Ekran | Šta sadrži |
|---|---|
| **Početna** (mesec) | Izbor meseca (← →). Kartice: Početno stanje, Potrošeno, Ušteđeno, Preostalo. Traka „iskorišćeno X%“. Danas potrošeno, prosečno dnevno, broj kupovina. **Novo:** „Možeš da trošiš još X dnevno do kraja meseca“, udeo bespotrebnog, poređenje sa prošlim mesecom. Potrošnja po kategorijama (udeo i traka do limita), potrošnja po danima (stubići), rečenica „Najviše trošite na …“ |
| **+ Dodaj** | Donji panel: iznos (numerička tastatura) → kategorija (dugmići sa ikonicama) → opis sa predlozima iz istorije („voda“, „hleb“ odmah popune kategoriju) → datum (danas) → Potrebno/Bespotrebno → ko je platio. Čuvanje jednim dodirom, „Sačuvaj i dodaj još“ za račun iz prodavnice |
| **Troškovi** | Lista po danima sa dnevnim zbirom, pretraga po opisu, filteri (kategorija, potrebno/bespotrebno, ko je platio), izmena, brisanje sa „Poništi“. Iznad liste: Prihodi i Štednja za mesec, sa dodavanjem |
| **Godina** | Tabela svih meseci: početno stanje, potrošeno, ušteđeno, preostalo, najveća kategorija. Mesec × kategorija (tamnija boja = više para). Ukupno potrošeno, ukupno ušteđeno, prosečna mesečna potrošnja, najskuplji mesec, najveća kategorija u godini. Grafikon prihod / potrošnja / štednja po mesecima |
| **Podešavanja** | Kategorije (naziv, ikonica, boja, redosled, mesečni limit, podrazumevano potrebno/bespotrebno, arhiviranje), ponavljajući troškovi, domaćinstvo i kod za poziv, uvoz iz Excela, izvoz u Excel, odjava |

**Šta je bolje nego u Excelu**
- **Prenos u sledeći mesec je automatski.** Preostalo iz jednog meseca samo postaje deo početnog
  stanja sledećeg. Ako je u novčaniku stvarno ostalo nešto drugo, upišeš stvarni iznos
  („Uskladi stanje“) i to se pamti.
- **Prihodi su posebni unosi** (plata, honorar, poklon…) sa opisom i osobom, umesto `=SUM(...)`.
- **Ponavljajući troškovi:** kirija, struja, internet, kredit, studentski kredit, teretana, Netflix.
  Upišeš ih jednom, a svakog meseca se pojave kao „Za plaćanje“ i potvrdiš ih jednim dodirom.
- **Limit po kategoriji** (npr. Brza hrana 15.000 mesečno) i upozorenje kad se približiš.
- **Ko je platio:** vidi se koliko je ko potrošio.
- Oboje unosite sa svojih telefona, a podaci se odmah sinhronizuju.

**Kategorije na početku** (preuzete iz Excela, plus predlozi):
Hrana 🛒 · Brza hrana i grickalice 🍟 (podrazumevano bespotrebno) · Računi 🧾 · Zabava 🎉 ·
Auto 🚗 · Zdravlje 💊 · Lična higijena 🧴 · Potrepštine za kuću 🏠 · Odeća 👕 · Obuća 👟 ·
Putovanja ✈️ · Ostalo 📦 · *novo:* Pokloni 🎁 · Pretplate 📺 · Telefon i tehnika 📱 ·
Papiri i škola 📄. Sve se menja u Podešavanjima. „Prebacivanje u sledeći mesec“ više ne postoji.

---

## 3. Tehnologije

Isto kao Balans, pa već znaš kako sve radi.

| Deo | Alat | Zašto |
|---|---|---|
| Frontend | Vite + React + TypeScript | brz razvoj, tipovi hvataju greške |
| Izgled | Tailwind CSS | brzo pravljenje mobilnog izgleda |
| Baza i prijava | Supabase (besplatni plan, **novi projekat**) | Postgres, nalozi, zajedničko domaćinstvo, sigurnost (RLS) |
| Podaci u aplikaciji | TanStack Query | keširanje, odmah vidiš novi trošak |
| Grafikoni | Recharts | kategorije, dani, meseci |
| Excel | SheetJS (`xlsx`) | uvoz tvog fajla i izvoz |
| Instalacija na telefon | vite-plugin-pwa | ikonica na početnom ekranu |
| Testovi | Vitest | provera svih računanja novca |
| Hosting | Vercel (besplatni plan) | objavljivanje sa GitHub-a |

---

## 4. Baza podataka

Svaka tabela ima `household_id`. RLS: član domaćinstva čita i menja sve redove svog domaćinstva,
a niko drugi ništa.

```
households          id, name, invite_code text unique, created_at

household_members   household_id, user_id, display_name, joined_at
                    PRIMARY KEY (household_id, user_id)

categories          id, household_id, name, emoji, color, sort int,
                    monthly_limit numeric null, default_necessity ('needed'|'unneeded'),
                    archived bool default false, created_at

expenses            id, household_id, date, category_id, description text,
                    amount numeric(12,2) CHECK (amount > 0),
                    necessity ('needed'|'unneeded'), paid_by uuid null, note text null,
                    recurring_id uuid null, import_batch uuid null,
                    created_by uuid, created_at, updated_at

incomes             id, household_id, date, source text, amount numeric(12,2),
                    received_by uuid null, note text null, import_batch uuid null, created_at

savings             id, household_id, date, amount numeric(12,2)   -- minus = podizanje
                    note text null, import_batch uuid null, created_at

month_settings      household_id, month date (1. u mesecu), carry_enabled bool default true,
                    carry_override numeric(12,2) null
                    PRIMARY KEY (household_id, month)

recurring_expenses  id, household_id, name, category_id, amount numeric(12,2),
                    day_of_month int (1–31), necessity, active bool default true, sort int

import_batches      id, household_id, file_name, created_by, created_at
```

**Funkcije u bazi (RPC):**
- `is_member(household_id)` — pomoćna za RLS (security definer)
- `create_household(name)` — pravi domaćinstvo, upisuje te kao člana, ubacuje početne kategorije,
  pravi kod za poziv
- `join_household(invite_code)` — dečko se pridružuje tvom domaćinstvu

Napomena: ponavljajući trošak je „plaćen“ za mesec kad postoji red u `expenses` sa tim
`recurring_id` u tom mesecu.

---

## 5. Struktura projekta

```
kasica/
├─ CLAUDE.md                pravila projekta (Claude ih čita sam)
├─ PLAN.md                  ovaj plan
├─ supabase/migrations/     SQL za tabele, RLS i funkcije
├─ public/icons/            ikonice aplikacije
└─ src/
   ├─ i18n/  sr.ts
   ├─ lib/   supabase.ts, dates.ts, money.ts, budget.ts (+ testovi), excelImport.ts (+ testovi)
   ├─ data/  households.ts, categories.ts, expenses.ts, incomes.ts, savings.ts,
   │         monthSettings.ts, recurring.ts
   ├─ types/ database.ts
   ├─ components/  Layout, BottomNav, MonthSwitcher, AmountInput, CategoryPicker,
   │               ExpenseSheet, StatCard, ProgressBar, UndoToast, ...
   └─ pages/ Home, Expenses, Year, Settings, Login, Household, Import
```

---

## 6. Faze

### Faza 0 — Priprema (radiš sama, ~20 min)
1. Napravi folder `kasica`, ubaci u njega `CLAUDE.md` i `PLAN.md`.
2. Na GitHub-u napravi prazan privatni repozitorijum `kasica`.
3. Na supabase.com napravi **novi projekat** `kasica` (region: Frankfurt / EU). Besplatni plan
   dozvoljava dva projekta, pa Balans ostaje kako jeste. Sačuvaj **Project URL** i
   **anon public key** (Settings → API).
4. Pripremi `Budzet_kucni.xlsx` (trebaće u Fazi 5).

**Gotovo kada:** imaš folder sa dva fajla, prazan GitHub repo i Supabase projekat.

---

### Faza 1 — Kostur aplikacije
**Poruka za Claude:**
> Pročitaj CLAUDE.md i PLAN.md. Uradi Fazu 1: napravi Vite + React + TypeScript projekat u ovom
> folderu, dodaj Tailwind, React Router, ESLint i Vitest. Napravi src/i18n/sr.ts za sve tekstove.
> Napravi Layout sa zaglavljem i donjom navigacijom: Početna, Troškovi, veliko dugme + u sredini
> (za sada otvara prazan donji panel), Godina, Podešavanja. Na Početnoj i Troškovima dodaj
> MonthSwitcher (prethodni mesec, sledeći mesec, „ovaj mesec“, naziv meseca na srpskom).
> U src/lib/money.ts napravi formatRSD i parseAmount (prihvata „1.234,50“, „1234.5“, „1234“)
> sa testovima. Izgled: svetla i tamna tema po sistemu, prijatne boje, veliki brojevi za iznose.
> Inicijalizuj git i poveži sa mojim GitHub repozitorijumom. Prvo mi pokaži plan.

**Gotovo kada:**
- `npm run dev` otvara aplikaciju, navigacija i promena meseca rade
- testovi za formatiranje i čitanje iznosa prolaze
- izgleda dobro na širini telefona (Inspect → režim telefona)
- kod je na GitHub-u

---

### Faza 2 — Supabase, prijava i zajedničko domaćinstvo
**Poruka za Claude:**
> Uradi Fazu 2 iz PLAN.md. Poveži Supabase (URL i anon key su u .env.local). Napravi SQL migraciju
> u supabase/migrations sa svim tabelama iz odeljka 4, funkcijama is_member, create_household
> (sa početnim kategorijama iz odeljka 2, sa emodžijima, bojama i default_necessity) i
> join_household, i RLS politikama tako da član vidi i menja samo podatke svog domaćinstva.
> Generiši TypeScript tipove. Napravi prijavu i registraciju (email + lozinka), zaštiti sve
> ekrane, i posle prve prijave ekran Domaćinstvo: „Napravi novo“ (naziv, tvoje ime) ili
> „Pridruži se kodom“. U Podešavanjima prikaži članove, kod za poziv sa dugmetom Kopiraj, i
> odjavu. Prvo plan.

**Ti radiš:** napraviš `.env.local` sa ključevima; u Supabase → Authentication isključiš
„Confirm email“ dok razvijaš.

**Gotovo kada:**
- napraviš nalog i domaćinstvo, a dečko napravi svoj nalog i uđe sa tvojim kodom
- oboje vidite iste kategorije
- test: treći nalog bez koda ne vidi ništa od vaših podataka

---

### Faza 3 — Unos i lista troškova
**Poruka za Claude:**
> Uradi Fazu 3 iz PLAN.md. Dugme + otvara ExpenseSheet: AmountInput sa numeričkom tastaturom
> (fokus odmah na iznosu), CategoryPicker kao mreža dugmića sa emodžijima (samo nearhivirane),
> opis sa predlozima iz ranijih opisa domaćinstva (izbor predloga popuni kategoriju i
> potrebno/bespotrebno iz poslednjeg takvog troška), datum (danas, može da se promeni),
> prekidač Potrebno/Bespotrebno (podrazumevano iz kategorije), ko je platio (podrazumevano ja),
> napomena u sklopivom delu. Dugmad „Sačuvaj“ i „Sačuvaj i dodaj još“ (zadrži datum i ko je
> platio). Ekran Troškovi: lista za izabrani mesec grupisana po danima sa zbirom dana, pretraga
> po opisu, filteri (kategorija, potrebno/bespotrebno, ko je platio), dodir na trošak otvara
> izmenu, brisanje sa „Poništi“ porukom. Optimistično dodavanje preko TanStack Query. Prvo plan.

**Gotovo kada:**
- dodaš 5 stavki iz jednog računa za manje od minut
- kad počneš da kucaš „vo“ predloži se „voda“ i sama izabere kategoriju Hrana
- trošak koji doda dečko vidiš posle osvežavanja na svom telefonu
- izmena, brisanje i „Poništi“ rade

---

### Faza 4 — Prihodi, štednja, prenos i Početna
**Poruka za Claude:**
> Uradi Fazu 4 iz PLAN.md. U src/lib/budget.ts napravi čiste funkcije po pravilima iz CLAUDE.md
> („Month summary“): carry_in, opening, spent, saved, remaining, used_pct, avg_per_day,
> daily_allowance, unneeded_pct, zbir po kategoriji i po danu, i lanac prenosa kroz mesece.
> Napiši detaljne testove (prvi mesec bez prenosa, carry_override, isključen prenos, prestupna
> godina, prazan mesec, tekući mesec). Na ekranu Troškovi iznad liste dodaj sekcije Prihodi i
> Štednja za mesec (dodavanje, izmena, brisanje; štednja može biti i podizanje). Na Početnoj:
> četiri kartice (Početno stanje sa podelom „preneto + prihodi“, Potrošeno, Ušteđeno,
> Preostalo), traka iskorišćenosti, Danas, Prosečno dnevno, Broj kupovina, „Možeš još X dnevno“
> za tekući mesec, udeo bespotrebnog, razlika u odnosu na prošli mesec. Kod početnog stanja
> dugme „Uskladi stanje“ koje upisuje carry_override, i prekidač „Prenesi ostatak iz prošlog
> meseca“. Prvo plan.

**Gotovo kada:**
- svi testovi u budget.ts prolaze
- preostalo iz septembra se samo pojavljuje kao „preneto“ u oktobru
- „Uskladi stanje“ menja početno stanje i to ostaje zapamćeno

---

### Faza 5 — Uvoz iz Excela
**Poruka za Claude:**
> Uradi Fazu 5 iz PLAN.md. U Podešavanjima dodaj „Uvoz iz Excela“: biram .xlsx, parsiranje u
> pregledaču sa SheetJS (logika u src/lib/excelImport.ts sa testovima). Pravila:
> 1) List „Troškovi“, od 4. reda: Datum, Kategorija, Opis, Iznos, Napomena
>    (Potrebno → needed, Bespotrebno → unneeded). Kategorije se mapiraju po nazivu (bez razmaka
>    na krajevima); nepoznate ponudi da napravim ili da izaberem postojeću.
> 2) Redovi kategorije „Prebacivanje u sledeći mesec“ se NE uvoze kao trošak, nego postaju
>    carry_override za SLEDEĆI mesec.
> 3) Redovi bez iznosa se ne uvoze, nego se prikazuju na listi upozorenja.
> 4) List „Godišnji pregled“: godina iz B2, meseci u redovima 5–16. Kolonu B (Početno stanje)
>    čitaj kao FORMULU: svaki broj iz =SUM(...) je poseban prihod „Prihod (uvoz)“ na 1. u mesecu,
>    osim broja koji je jednak prebacivanju iz prethodnog meseca (to je prenos, ne prihod).
>    Ako je B obična vrednost, to je jedan prihod. Kolona D (Štednja) postaje unos u savings.
> 5) Pre upisa prikaži pregled: broj troškova, prihoda i štednji po mesecu i zbirove, pa dugme
>    Uvezi. Sve dobija isti import_batch; dodaj „Poništi uvoz“ koji briše ceo batch.
> Prvo plan.

**Gotovo kada** (brojevi iz tvog fajla od 22.10.):
- uvezeno 583 troška, 1 upozorenje (red bez iznosa), 2 prebacivanja pretvorena u prenos
- Avgust: početno stanje 302.817, potrošeno 190.521, ušteđeno 75.200
- Septembar: početno 232.856 (preneto 10.396 + prihodi 222.460), potrošeno 196.724, preostalo 0
- Oktobar: početno 249.982 (preneto 36.132 + prihodi 213.850), potrošeno 175.990
- „Poništi uvoz“ sve vraća na staro

---

### Faza 6 — Grafikoni i limiti po kategoriji
**Poruka za Claude:**
> Uradi Fazu 6 iz PLAN.md. Na Početnoj: potrošnja po kategorijama (lista sa emodžijem, iznosom,
> udelom u % i trakom; ako kategorija ima monthly_limit, traka pokazuje iznos prema limitu i
> postaje narandžasta od 80% i crvena preko 100%), prsten (donut) sa udelima, stubići po danima
> u mesecu sa linijom prosečnog dnevnog, i rečenica „Najviše trošite na: X (iznos)“. Dodir na
> kategoriju otvara Troškove filtrirane po njoj. Odvojeno prikaži Potrebno vs Bespotrebno i
> „Ko je koliko platio“. U Podešavanjima → Kategorije: izmena naziva, emodžija, boje, limita i
> default_necessity, redosled prevlačenjem ili strelicama, arhiviranje. Grafikoni dobro na
> telefonu i u tamnoj temi. Prvo plan.

**Gotovo kada:**
- zbir po kategorijama je jednak „Potrošeno“ (to je bila greška u Excelu)
- postaviš limit za Brzu hranu i vidiš traku i boju
- preimenovanje kategorije odmah se vidi svuda, a arhivirana ostaje u istoriji

---

### Faza 7 — Godišnji pregled
**Poruka za Claude:**
> Uradi Fazu 7 iz PLAN.md. Ekran Godina sa izborom godine: tabela 12 meseci (početno stanje,
> potrošeno, ušteđeno, preostalo, najveća kategorija), red UKUPNO, i tabela mesec × kategorija
> u kojoj je jačina boje ćelije srazmerna iznosu (sve kategorije, uključujući arhivirane koje
> imaju troškove). Ispod: ukupno potrošeno, ukupno ušteđeno, prosečna mesečna potrošnja
> (samo meseci sa troškovima), najskuplji mesec, najveća kategorija u godini, udeo bespotrebnog.
> Grafikon po mesecima: prihodi, potrošnja i štednja. Na telefonu tabela klizi vodoravno sa
> zaključanom prvom kolonom. Dodir na mesec otvara Početnu za taj mesec. Računanje u budget.ts
> sa testovima. Prvo plan.

**Gotovo kada:** Lična higijena i Brza hrana se vide u svim mesecima i u UKUPNO, a zbirovi se
slažu sa Početnom za svaki mesec.

---

### Faza 8 — Ponavljajući troškovi
**Poruka za Claude:**
> Uradi Fazu 8 iz PLAN.md. U Podešavanjima lista ponavljajućih troškova (naziv, kategorija,
> iznos, dan u mesecu, potrebno/bespotrebno, aktivno). Na Početnoj kartica „Za plaćanje ovog
> meseca“: stavke koje još nemaju trošak sa tim recurring_id u izabranom mesecu, sortirane po
> danu, sa oznakom „kasni“ kad je dan prošao. Dodir „Plaćeno“ otvara ExpenseSheet popunjen tim
> podacima (iznos može da se promeni, npr. struja), a čuvanje upisuje recurring_id. Ako je
> dan 31, a mesec ima manje dana, koristi poslednji dan. Prvo plan.

**Ti radiš:** upišeš kiriju, struju, internet, kredit, studentski kredit, teretanu, Netflix i
Disney+.

**Gotovo kada:** posle potvrde kirija nestaje sa liste „Za plaćanje“ i pojavljuje se u troškovima.

---

### Faza 9 — Izvoz, instalacija na telefon i objavljivanje
**Poruka za Claude:**
> Uradi Fazu 9 iz PLAN.md. 1) Izvoz u Excel za izabranu godinu: listovi Troškovi, Prihodi,
> Štednja, Pregled po mesecima. 2) vite-plugin-pwa: manifest (naziv Kasica, boje, ikonice 192,
> 512 i maskable), service worker koji kešira osnovni izgled, i jednostavna ikonica kasice.
> 3) Supabase Realtime za expenses, incomes i savings, da se trošak koji doda jedno od nas
> odmah pojavi kod drugog bez osvežavanja. 4) Pripremi projekat za Vercel (vercel.json za SPA
> rute) i objasni mi korake za objavljivanje. Prvo plan.

**Ti radiš:**
1. Na vercel.com: Add New → Project → izabereš `kasica` sa GitHub-a.
2. Dodaš `VITE_SUPABASE_URL` i `VITE_SUPABASE_ANON_KEY` u Environment Variables → Deploy.
3. U Supabase → Authentication → URL Configuration dodaš Vercel adresu kao Site URL.
4. Oboje na Android telefonu otvorite adresu u Chrome-u → meni (⋮) → **Instaliraj aplikaciju**.

**Gotovo kada:** Kasica ima ikonicu na oba telefona, trošak koji dečko doda vidiš za par sekundi,
a izvezeni Excel se otvara i brojevi se slažu.

---

### Faza 10 — Doterivanje (po želji, kasnije)
Ideje kad osnovno proradi, svaka kao posebna mala faza:
- ciljevi štednje (npr. „Letovanje 150.000“) sa trakom napretka
- prikaz u evrima po kursu koji upišeš
- obaveštenje kad pređete limit kategorije ili kad stiže račun
- slikanje fiskalnog računa (QR kod sa računa automatski popuni stavke)
- „Šta je novo“: koliko ste ove nedelje potrošili na bespotrebno u odnosu na prošlu
- dugme za brz unos čestih stvari (voda, hleb, gorivo) na Početnoj
- engleski jezik (tekstovi su već u sr.ts)

---

## 7. Saveti za rad sa Claude u terminalu
- Uvek jedna faza u jednoj sesiji. Kad počinješ novu, napiši „Uradi Fazu N iz PLAN.md“.
- Traži plan pre koda; ako ti nešto u planu ne odgovara, reci pre nego što krene.
- Posle svake faze proveri sama „Gotovo kada“ stavke, pa tek onda commit i push.
- Ako nešto ne radi, nalepi Claude-u tačnu grešku iz terminala ili iz konzole pregledača.
- Ključeve iz Supabase-a nikad ne stavljaj u kod ni u chat, samo u `.env.local`.
- Excel nastavi da koristiš dok ne završiš Fazu 5, pa onda pređite na aplikaciju. Ponovni uvoz
  istog fajla napravi duplikate, zato prvo „Poništi uvoz“, pa tek onda uvezi novu verziju.
