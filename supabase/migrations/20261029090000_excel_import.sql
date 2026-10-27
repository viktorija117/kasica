-- Excel import (Faza 5).
-- An import writes categories, expenses, incomes, savings and carry overrides in ONE transaction
-- through import_workbook(), and undo_import() takes all of it back out again.

-- Categories the import created, so undo can remove them when nothing else uses them.
alter table public.categories add column import_batch uuid;
alter table public.categories
  add constraint categories_household_id_import_batch_fkey
  foreign key (household_id, import_batch)
  references public.import_batches (household_id, id) on delete set null (import_batch);

-- month_settings rows the import overwrote, as they were before:
-- [{ "month": "2026-09-01", "existed": true, "carry_enabled": true, "carry_override": null }]
alter table public.import_batches
  add column month_settings_before jsonb not null default '[]'::jsonb;

-- p_categories: [{ key, name, emoji, color, default_necessity }]  new categories
-- p_expenses:   [{ date, category_id | category_key, description, amount, necessity }]
--               category_key points at a new category's key
-- p_incomes:    [{ date, source, amount }]
-- p_savings:    [{ date, amount, note }]
-- p_carry:      [{ month, amount }]  becomes month_settings.carry_override
--
-- security invoker: the caller's RLS policies still decide what may be written.
create function public.import_workbook(
  p_household_id uuid,
  p_file_name text,
  p_categories jsonb,
  p_expenses jsonb,
  p_incomes jsonb,
  p_savings jsonb,
  p_carry jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  batch_id uuid;
  category_ids jsonb := '{}'::jsonb;
  next_sort integer;
  new_id uuid;
  cat record;
begin
  if not public.is_member(p_household_id) then
    raise exception 'not_member';
  end if;

  insert into public.import_batches (household_id, file_name, month_settings_before)
  select p_household_id, left(btrim(p_file_name), 200), coalesce(jsonb_agg(jsonb_build_object(
    'month', c.month,
    'existed', s.month is not null,
    'carry_enabled', s.carry_enabled,
    'carry_override', s.carry_override
  )), '[]'::jsonb)
  from jsonb_to_recordset(p_carry) as c (month date, amount numeric)
  left join public.month_settings s on s.household_id = p_household_id and s.month = c.month
  returning id into batch_id;

  select coalesce(max(sort), 0) into next_sort
  from public.categories where household_id = p_household_id;

  for cat in
    select * from jsonb_to_recordset(p_categories)
      as x (key text, name text, emoji text, color text, default_necessity public.necessity)
  loop
    next_sort := next_sort + 1;
    insert into public.categories
      (household_id, name, emoji, color, sort, default_necessity, import_batch)
    values
      (p_household_id, btrim(cat.name), cat.emoji, cat.color, next_sort, cat.default_necessity, batch_id)
    returning id into new_id;
    category_ids := category_ids || jsonb_build_object(cat.key, new_id);
  end loop;

  insert into public.expenses
    (household_id, date, category_id, description, amount, necessity, import_batch)
  select
    p_household_id, e.date, coalesce(e.category_id, (category_ids ->> e.category_key)::uuid),
    e.description, e.amount, e.necessity, batch_id
  from jsonb_to_recordset(p_expenses) as e (
    date date, category_id uuid, category_key text, description text, amount numeric,
    necessity public.necessity
  );

  insert into public.incomes (household_id, date, source, amount, import_batch)
  select p_household_id, i.date, i.source, i.amount, batch_id
  from jsonb_to_recordset(p_incomes) as i (date date, source text, amount numeric);

  insert into public.savings (household_id, date, amount, note, import_batch)
  select p_household_id, s.date, s.amount, s.note, batch_id
  from jsonb_to_recordset(p_savings) as s (date date, amount numeric, note text);

  insert into public.month_settings (household_id, month, carry_override)
  select p_household_id, c.month, c.amount
  from jsonb_to_recordset(p_carry) as c (month date, amount numeric)
  on conflict (household_id, month) do update set carry_override = excluded.carry_override;

  return batch_id;
end;
$$;

-- Removes everything one import wrote and restores the month settings it overwrote.
create function public.undo_import(p_batch_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  batch public.import_batches%rowtype;
begin
  -- RLS hides batches of other households, so they look exactly like missing ones.
  select * into batch from public.import_batches where id = p_batch_id;
  if batch.id is null then
    raise exception 'import_not_found';
  end if;

  delete from public.month_settings s
  using jsonb_to_recordset(batch.month_settings_before) as m (month date, existed boolean)
  where s.household_id = batch.household_id and s.month = m.month and not m.existed;

  update public.month_settings s
  set carry_enabled = m.carry_enabled, carry_override = m.carry_override
  from jsonb_to_recordset(batch.month_settings_before)
    as m (month date, existed boolean, carry_enabled boolean, carry_override numeric)
  where s.household_id = batch.household_id and s.month = m.month and m.existed;

  -- Expenses first: their category foreign key would block deleting the categories.
  delete from public.expenses where household_id = batch.household_id and import_batch = batch.id;

  delete from public.categories c
  where c.household_id = batch.household_id
    and c.import_batch = batch.id
    and not exists (
      select 1 from public.expenses e
      where e.household_id = c.household_id and e.category_id = c.id
    )
    and not exists (
      select 1 from public.recurring_expenses r
      where r.household_id = c.household_id and r.category_id = c.id
    );

  -- Cascades to the batch's incomes and savings.
  delete from public.import_batches where id = batch.id;
end;
$$;

revoke execute on function public.import_workbook(uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb)
  from public, anon;
revoke execute on function public.undo_import(uuid) from public, anon;
grant execute on function public.import_workbook(uuid, text, jsonb, jsonb, jsonb, jsonb, jsonb)
  to authenticated;
grant execute on function public.undo_import(uuid) to authenticated;
