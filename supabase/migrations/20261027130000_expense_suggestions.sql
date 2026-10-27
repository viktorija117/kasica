-- Description suggestions for the expense form.
-- One row per distinct description (case-insensitive) of a household, carrying the category
-- and necessity of the most recent expense with that description, so picking "voda" fills
-- in whatever was used last time. `uses` ranks frequent descriptions first.
--
-- security_invoker makes the view run with the caller's rights, so the RLS policy on
-- expenses still decides which rows are visible.
create view public.expense_suggestions
with (security_invoker = true)
as
select distinct on (e.household_id, lower(e.description))
  e.household_id,
  e.description,
  e.category_id,
  e.necessity,
  count(*) over (partition by e.household_id, lower(e.description))::int as uses,
  e.date as last_date
from public.expenses e
where e.description <> ''
order by e.household_id, lower(e.description), e.date desc, e.created_at desc;

revoke all on public.expense_suggestions from public, anon;
grant select on public.expense_suggestions to authenticated;
