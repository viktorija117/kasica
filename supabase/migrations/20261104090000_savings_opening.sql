-- Savings the household already had before it started recording them in the app.
-- Added to the sum of all savings to show how much is in savings now.
alter table public.households
  add column savings_opening numeric(12, 2) not null default 0
    check (savings_opening >= 0);

-- Members may change it next to the name; everything else stays RPC only.
grant update (savings_opening) on public.households to authenticated;
