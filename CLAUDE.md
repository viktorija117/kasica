# Kasica — project context for Claude

Kasica is a Serbian-language installable web app (PWA) for a couple who track their shared
household budget together. It replaces an Excel workbook ("Budžet kućni.xlsx") that has:
an expenses log, a monthly overview, a yearly overview and a category list. The app must do
everything the workbook does, correctly, and be faster to use on a phone.

The owner is building it step by step from `PLAN.md`. Work on ONE phase at a time, in order.
Before writing code for a phase, show a short plan and wait for approval.

## Users
- Two people (the owner and her partner) share ONE household. Each has their own login,
  both see and edit ALL data of their household.
- Both use Android phones; the owner also uses a MacBook.
- Every expense records who paid (`paid_by`) and who entered it (`created_by`).

## Domain rules (the important part)
- Currency: RSD only. Amounts can have decimals (e.g. 69.99). Display with `sr-RS` formatting:
  `1.234 RSD`, decimals only when non-zero.
- Month summary (all money values for a month M):
  - `carry_in(M)` = `month_settings.carry_override` if set; else `remaining(M-1)` if
    `carry_enabled` (default true) and M-1 has any data; else 0.
  - `opening(M)` = `carry_in(M)` + sum of incomes in M  ("Početno stanje")
  - `spent(M)` = sum of expenses in M                    ("Potrošeno")
  - `saved(M)` = sum of savings in M (withdrawals are negative)   ("Ušteđeno")
  - `remaining(M)` = `opening - spent - saved`            ("Preostalo")
  - `used_pct` = `spent / opening` (0 when opening is 0)
  - `avg_per_day` = `spent / days_elapsed` for the current month, `spent / days_in_month` for
    past months
  - `daily_allowance` (current month only) = `remaining / days_left_including_today`
  - `unneeded_pct` = sum of expenses with `necessity = 'unneeded'` / `spent`
- Carry-over between months is AUTOMATIC. There is no "Prebacivanje u sledeći mesec" category
  and it never counts as spending.
- Savings are NOT an expense category; they live in their own table.
- Categories are per household, can be renamed, reordered, recoloured and archived (never hard
  deleted when they have expenses). Archived categories still show in history and reports.
- Each category has a `default_necessity` used to pre-fill new expenses.
- A "day" is the user's local calendar day, stored as `date` (YYYY-MM-DD), never derived from a
  UTC timestamp. Weeks start on Monday. Month key = first day of month (`2026-10-01`).

## Stack (do not change without asking)
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS
- React Router
- All UI text in Serbian (Latin script). Keep every user-facing string in `src/i18n/sr.ts`
  (one object) so English can be added later; do not hardcode text inside components.
- Supabase: Auth (email + password), Postgres with Row Level Security, RPC functions
- TanStack Query for data fetching, cache and optimistic updates
- Recharts for charts
- date-fns with `sr-Latn` locale
- SheetJS (`xlsx`) for Excel import and export (client side only)
- vite-plugin-pwa for install + offline shell
- Vitest + Testing Library
- Hosting: Vercel

## Conventions
- Code, file names, DB columns and comments in English. UI text in Serbian.
- Mobile-first: design for ~390px width first, then laptop. Bottom tab bar with a central
  "+" button on phone. Adding an expense must take at most a few taps.
- Amount input opens the numeric keyboard (`inputMode="decimal"`), accepts both `,` and `.`.
- Components in `src/components`, pages in `src/pages`, Supabase queries in `src/data`
  (one file per table, typed), shared types in `src/types`, pure logic in `src/lib`.
- ALL money math lives in `src/lib/budget.ts` as pure functions with tests. Components never
  sum money themselves.
- Keep components small; no business logic inside JSX.
- Security: every table has `household_id` and RLS that allows access only to members of that
  household (via a `security definer` helper `is_member(household_id)`). Never use the service
  role key in the frontend. Only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` go in
  `.env.local`, and `.env*` is in `.gitignore`.
- Destructive actions (delete expense, archive category) use an in-app confirm or an "Poništi"
  (undo) toast — never `window.confirm`.
- After each phase: run `npm run lint`, `npm run test`, `npm run build`, then commit with a clear
  message.

## Commands
- `npm run dev` — local dev server
- `npm run test` — tests
- `npm run lint` — lint
- `npm run build` — production build
- `npx supabase db push` — apply migrations (after `supabase link`)
