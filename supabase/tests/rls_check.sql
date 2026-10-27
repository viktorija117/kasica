-- Manual RLS check: what can a given account see?
-- Run in Supabase → SQL Editor. Replace the email with the account to test (e.g. the third
-- test account). Everything runs inside a transaction that is rolled back, so nothing changes.
-- Expected for an account without a household: every count is 0.
-- Expected for a member: only their own household's rows.

begin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', (select id from auth.users where email = 'treci@example.com'),
    'role', 'authenticated'
  )::text,
  true
);
set local role authenticated;

select 'households' as tabela, count(*) from public.households
union all select 'household_members', count(*) from public.household_members
union all select 'categories', count(*) from public.categories
union all select 'expenses', count(*) from public.expenses
union all select 'incomes', count(*) from public.incomes
union all select 'savings', count(*) from public.savings
union all select 'month_settings', count(*) from public.month_settings
union all select 'recurring_expenses', count(*) from public.recurring_expenses
union all select 'receipts', count(*) from public.receipts
union all select 'import_batches', count(*) from public.import_batches;

rollback;
