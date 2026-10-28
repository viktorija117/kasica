-- Fiscal receipts (Faza 9).
-- save_receipt() writes the receipt and all of its expenses in ONE transaction, so a receipt is
-- either saved whole or not at all. The unique (household_id, url) on receipts already stops
-- the same receipt from being entered twice; here that becomes the error 'receipt_exists'.

-- p_expenses: [{ date, category_id, description, amount, necessity, paid_by }]
--
-- security invoker: the caller's RLS policies still decide what may be written.
create function public.save_receipt(
  p_household_id uuid,
  p_url text,
  p_store text,
  p_date date,
  p_total numeric,
  p_expenses jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  receipt_id uuid;
begin
  if not public.is_member(p_household_id) then
    raise exception 'not_member';
  end if;
  if jsonb_typeof(p_expenses) <> 'array' or jsonb_array_length(p_expenses) = 0 then
    raise exception 'receipt_without_expenses';
  end if;

  begin
    insert into public.receipts (household_id, url, store, date, total)
    values (p_household_id, btrim(p_url), nullif(left(btrim(p_store), 200), ''), p_date, p_total)
    returning id into receipt_id;
  exception when unique_violation then
    raise exception 'receipt_exists';
  end;

  insert into public.expenses
    (household_id, date, category_id, description, amount, necessity, paid_by, receipt_id)
  select
    p_household_id, e.date, e.category_id, coalesce(btrim(e.description), ''), e.amount,
    e.necessity, e.paid_by, receipt_id
  from jsonb_to_recordset(p_expenses) as e (
    date date, category_id uuid, description text, amount numeric,
    necessity public.necessity, paid_by uuid
  );

  return receipt_id;
end;
$$;

revoke execute on function public.save_receipt(uuid, text, text, date, numeric, jsonb)
  from public, anon;
grant execute on function public.save_receipt(uuid, text, text, date, numeric, jsonb)
  to authenticated;
