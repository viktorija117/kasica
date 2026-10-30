-- Undoing an import used to put back every month setting it had overwritten, also wiping
-- carry changes the user made after the import. The import now also remembers the amount it
-- wrote ("imported"), and undo only takes a month back when that amount is still there.
-- It never touches carry_enabled: the import does not set it, so its value is the user's.
--
-- month_settings_before: [{ "month", "existed", "carry_enabled", "carry_override", "imported" }]
-- Batches made before this have no "imported"; undo treats them as before.

create or replace function public.import_workbook(
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
    'carry_override', s.carry_override,
    'imported', c.amount
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

-- Removes everything one import wrote and restores the carry overrides it overwrote, unless
-- they were changed since.
create or replace function public.undo_import(p_batch_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  batch public.import_batches%rowtype;
  months jsonb;
begin
  -- RLS hides batches of other households, so they look exactly like missing ones.
  select * into batch from public.import_batches where id = p_batch_id;
  if batch.id is null then
    raise exception 'import_not_found';
  end if;

  -- Months the user has changed since the import are left out, so they stay as they are.
  select coalesce(jsonb_agg(m || jsonb_build_object('knows_imported', m ? 'imported')), '[]'::jsonb)
  into months
  from jsonb_array_elements(batch.month_settings_before) as m
  left join public.month_settings s
    on s.household_id = batch.household_id and s.month = (m ->> 'month')::date
  where not (m ? 'imported') or s.carry_override is not distinct from (m ->> 'imported')::numeric;

  -- Rows the import created; kept (without the override) when the user switched carry off.
  delete from public.month_settings s
  using jsonb_to_recordset(months) as u (month date, existed boolean, knows_imported boolean)
  where s.household_id = batch.household_id and s.month = u.month and not u.existed
    and (s.carry_enabled or not u.knows_imported);

  update public.month_settings s
  set carry_override = u.carry_override,
      carry_enabled = case when u.knows_imported then s.carry_enabled else u.carry_enabled end
  from jsonb_to_recordset(months) as u (
    month date, existed boolean, carry_enabled boolean, carry_override numeric, knows_imported boolean
  )
  where s.household_id = batch.household_id and s.month = u.month
    and (u.existed or u.knows_imported);

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
