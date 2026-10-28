-- Per-month spending of every category, one row per month and category that has expenses.
-- The Year screen reads these few rows instead of every expense of the year (a year easily has
-- more than the 1000 rows one request returns). The overview itself is computed in
-- src/lib/budget.ts.
--
-- security_invoker makes the view run with the caller's rights, so the RLS policy on expenses
-- still decides which rows are visible.
create view public.month_category_totals
with (security_invoker = true)
as
select
  e.household_id,
  -- First day of the month; date minus integer stays a date (no time zone involved).
  (e.date - (extract(day from e.date)::int - 1)) as month,
  e.category_id,
  sum(e.amount)::numeric(14, 2) as spent,
  coalesce(sum(e.amount) filter (where e.necessity = 'unneeded'), 0)::numeric(14, 2) as unneeded
from public.expenses e
group by e.household_id, month, e.category_id;

revoke all on public.month_category_totals from public, anon;
grant select on public.month_category_totals to authenticated;
