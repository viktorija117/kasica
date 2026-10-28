-- Category editing (Faza 6).

-- An emoji can take several code points (flags, skin tones), but never a whole sentence.
alter table public.categories
  add constraint categories_emoji_length check (char_length(emoji) between 1 and 16);

-- Saves a new order of categories in one transaction: p_ids[1] gets sort 1, p_ids[2] sort 2, …
-- Categories of the household that are not in p_ids keep their sort.
--
-- security invoker: the caller's RLS policies still decide what may be changed.
create function public.reorder_categories(p_household_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_member(p_household_id) then
    raise exception 'not_a_member';
  end if;

  update public.categories c
  set sort = o.position
  from unnest(p_ids) with ordinality as o (id, position)
  where c.household_id = p_household_id and c.id = o.id;
end;
$$;

revoke execute on function public.reorder_categories(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_categories(uuid, uuid[]) to authenticated;
