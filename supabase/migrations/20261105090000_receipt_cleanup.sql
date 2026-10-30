-- A receipt row only exists to stop the same fiscal receipt from being entered twice. Once
-- every expense from it is deleted (or moved off it), the row is removed too, so the receipt
-- can be scanned and entered again. Before this, the leftover row blocked it forever.

-- security invoker: the caller's RLS policies still decide what may be deleted.
create function public.delete_empty_receipts()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.receipts r
  where (r.household_id, r.id) in (
      select distinct o.household_id, o.receipt_id from old_rows o where o.receipt_id is not null
    )
    and not exists (
      select 1 from public.expenses e
      where e.household_id = r.household_id and e.receipt_id = r.id
    );
  return null;
end;
$$;

create trigger expenses_delete_empty_receipts
  after delete on public.expenses
  referencing old table as old_rows
  for each statement execute function public.delete_empty_receipts();

create trigger expenses_update_empty_receipts
  after update on public.expenses
  referencing old table as old_rows
  for each statement execute function public.delete_empty_receipts();

-- Receipts already left without expenses.
delete from public.receipts r
where not exists (
  select 1 from public.expenses e where e.household_id = r.household_id and e.receipt_id = r.id
);
