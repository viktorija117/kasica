-- Recurring expenses (Faza 8).

-- Saves a new order of recurring expenses in one transaction: p_ids[1] gets sort 1, …
-- Same as reorder_categories; security invoker, so the caller's RLS policies still apply.
create function public.reorder_recurring_expenses(p_household_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_member(p_household_id) then
    raise exception 'not_a_member';
  end if;

  update public.recurring_expenses r
  set sort = o.position
  from unnest(p_ids) with ordinality as o (id, position)
  where r.household_id = p_household_id and r.id = o.id;
end;
$$;

revoke execute on function public.reorder_recurring_expenses(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_recurring_expenses(uuid, uuid[]) to authenticated;

create index recurring_expenses_household_sort_idx on public.recurring_expenses (household_id, sort);
