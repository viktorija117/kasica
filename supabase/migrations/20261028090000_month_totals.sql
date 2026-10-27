-- Per-month sums of incomes, expenses and savings, one row per month that has any of them.
-- The carry-over chain needs `remaining` of every earlier month, so the app reads these few
-- rows instead of every expense ever saved. The chain itself is computed in src/lib/budget.ts.
--
-- security_invoker makes the view run with the caller's rights, so the RLS policies on the
-- three tables still decide which rows are visible.
create view public.month_totals
with (security_invoker = true)
as
select
  t.household_id,
  -- First day of the month; date minus integer stays a date (no time zone involved).
  (t.date - (extract(day from t.date)::int - 1)) as month,
  coalesce(sum(t.amount) filter (where t.kind = 'income'), 0)::numeric(14, 2) as income,
  coalesce(sum(t.amount) filter (where t.kind = 'expense'), 0)::numeric(14, 2) as spent,
  coalesce(sum(t.amount) filter (where t.kind = 'saving'), 0)::numeric(14, 2) as saved,
  -- Rows behind the sums: a month whose deposits and withdrawals cancel out still has data.
  count(*)::int as entries
from (
  select household_id, date, amount, 'income' as kind from public.incomes
  union all
  select household_id, date, amount, 'expense' from public.expenses
  union all
  select household_id, date, amount, 'saving' from public.savings
) t
group by t.household_id, month;

revoke all on public.month_totals from public, anon;
grant select on public.month_totals to authenticated;
