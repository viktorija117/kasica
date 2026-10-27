-- Kasica: initial schema.
-- Every table carries household_id; RLS lets only members of that household touch its rows.
-- Households and memberships are created exclusively through the create_household /
-- join_household functions below, never by direct inserts from the client.

create extension if not exists pgcrypto with schema extensions;

create type public.necessity as enum ('needed', 'unneeded');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  invite_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- One household per account keeps the app simple; drop this to allow several.
  unique (user_id)
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  emoji text not null default '📦',
  color text not null default '#9e9e9e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  sort integer not null default 0,
  monthly_limit numeric(12, 2) check (monthly_limit > 0),
  default_necessity public.necessity not null default 'needed',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, id)
);

create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  file_name text not null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, id)
);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  category_id uuid not null,
  amount numeric(12, 2) not null check (amount > 0),
  day_of_month integer not null check (day_of_month between 1 and 31),
  necessity public.necessity not null default 'needed',
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (household_id, id),
  foreign key (household_id, category_id)
    references public.categories (household_id, id) on delete restrict
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  url text not null,
  store text,
  date date,
  total numeric(12, 2),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (household_id, id),
  -- The same fiscal receipt cannot be entered twice.
  unique (household_id, url)
);

-- Composite foreign keys (household_id, x) guarantee that a row can only point at
-- categories, members, batches etc. of its own household.
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  category_id uuid not null,
  description text not null default '' check (char_length(description) <= 200),
  amount numeric(12, 2) not null check (amount > 0),
  necessity public.necessity not null,
  paid_by uuid,
  note text check (char_length(note) <= 500),
  recurring_id uuid,
  import_batch uuid,
  receipt_id uuid,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, category_id)
    references public.categories (household_id, id) on delete restrict,
  foreign key (household_id, paid_by)
    references public.household_members (household_id, user_id) on delete set null (paid_by),
  foreign key (household_id, recurring_id)
    references public.recurring_expenses (household_id, id) on delete set null (recurring_id),
  foreign key (household_id, import_batch)
    references public.import_batches (household_id, id) on delete cascade,
  foreign key (household_id, receipt_id)
    references public.receipts (household_id, id) on delete set null (receipt_id)
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  source text not null check (char_length(btrim(source)) between 1 and 100),
  amount numeric(12, 2) not null check (amount > 0),
  received_by uuid,
  note text check (char_length(note) <= 500),
  import_batch uuid,
  created_at timestamptz not null default now(),
  foreign key (household_id, received_by)
    references public.household_members (household_id, user_id) on delete set null (received_by),
  foreign key (household_id, import_batch)
    references public.import_batches (household_id, id) on delete cascade
);

-- Negative amount = withdrawal from savings.
create table public.savings (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount <> 0),
  note text check (char_length(note) <= 500),
  import_batch uuid,
  created_at timestamptz not null default now(),
  foreign key (household_id, import_batch)
    references public.import_batches (household_id, id) on delete cascade
);

create table public.month_settings (
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (extract(day from month) = 1),
  carry_enabled boolean not null default true,
  carry_override numeric(12, 2),
  primary key (household_id, month)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index expenses_household_date_idx on public.expenses (household_id, date);
create index expenses_category_idx on public.expenses (household_id, category_id);
create index expenses_recurring_idx on public.expenses (household_id, recurring_id)
  where recurring_id is not null;
create index expenses_import_batch_idx on public.expenses (household_id, import_batch)
  where import_batch is not null;
create index expenses_receipt_idx on public.expenses (household_id, receipt_id)
  where receipt_id is not null;
create index incomes_household_date_idx on public.incomes (household_id, date);
create index savings_household_date_idx on public.savings (household_id, date);
create index categories_household_sort_idx on public.categories (household_id, sort);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- created_by is always the signed-in user and never changes afterwards.
create function public.set_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger expenses_created_by before insert or update on public.expenses
  for each row execute function public.set_created_by();
create trigger expenses_updated_at before update on public.expenses
  for each row execute function public.touch_updated_at();
create trigger receipts_created_by before insert or update on public.receipts
  for each row execute function public.set_created_by();
create trigger import_batches_created_by before insert or update on public.import_batches
  for each row execute function public.set_created_by();

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- security definer so RLS policies can check membership without recursing into
-- household_members' own policies.
create function public.is_member(hh uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = hh
      and m.user_id = (select auth.uid())
  );
$$;

-- 8 characters from an alphabet without look-alikes (no 0/O, 1/I). 32 symbols, so
-- `byte % 32` is unbiased.
create function public.generate_invite_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(8);
  code text := '';
begin
  for i in 0..7 loop
    code := code || substr(alphabet, (get_byte(bytes, i) % 32) + 1, 1);
  end loop;
  return code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create and join a household
-- Errors are raised with a stable message code the frontend maps to Serbian text.
-- ---------------------------------------------------------------------------

create function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hh_id uuid;
  code text;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'already_member';
  end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 60 then
    raise exception 'invalid_household_name';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 40 then
    raise exception 'invalid_display_name';
  end if;

  loop
    code := public.generate_invite_code();
    exit when not exists (select 1 from public.households where invite_code = code);
  end loop;

  insert into public.households (name, invite_code)
  values (btrim(p_name), code)
  returning id into hh_id;

  insert into public.household_members (household_id, user_id, display_name)
  values (hh_id, uid, btrim(p_display_name));

  insert into public.categories (household_id, name, emoji, color, sort, default_necessity)
  values
    (hh_id, 'Hrana',                   '🛒', '#43a047',  1, 'needed'),
    (hh_id, 'Brza hrana i grickalice', '🍟', '#fb8c00',  2, 'unneeded'),
    (hh_id, 'Računi',                  '🧾', '#546e7a',  3, 'needed'),
    (hh_id, 'Zabava',                  '🎉', '#d81b60',  4, 'needed'),
    (hh_id, 'Auto',                    '🚗', '#3949ab',  5, 'needed'),
    (hh_id, 'Zdravlje',                '💊', '#e53935',  6, 'needed'),
    (hh_id, 'Lična higijena',          '🧴', '#00acc1',  7, 'needed'),
    (hh_id, 'Potrepštine za kuću',     '🏠', '#8d6e63',  8, 'needed'),
    (hh_id, 'Odeća',                   '👕', '#8e24aa',  9, 'needed'),
    (hh_id, 'Obuća',                   '👟', '#6d4c41', 10, 'needed'),
    (hh_id, 'Putovanja',               '✈️', '#039be5', 11, 'needed'),
    (hh_id, 'Pokloni',                 '🎁', '#f4511e', 12, 'needed'),
    (hh_id, 'Pretplate',               '📺', '#5e35b1', 13, 'needed'),
    (hh_id, 'Telefon i tehnika',       '📱', '#00897b', 14, 'needed'),
    (hh_id, 'Papiri i škola',          '📄', '#9e9d24', 15, 'needed'),
    (hh_id, 'Ostalo',                  '📦', '#757575', 16, 'needed');

  return hh_id;
end;
$$;

create function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  hh_id uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.household_members where user_id = uid) then
    raise exception 'already_member';
  end if;
  if char_length(btrim(coalesce(p_display_name, ''))) not between 1 and 40 then
    raise exception 'invalid_display_name';
  end if;

  select id into hh_id
  from public.households
  where invite_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));

  if hh_id is null then
    raise exception 'invalid_invite_code';
  end if;

  insert into public.household_members (household_id, user_id, display_name)
  values (hh_id, uid, btrim(p_display_name));

  return hh_id;
end;
$$;

-- Functions are executable by PUBLIC by default; restrict them.
revoke execute on function public.is_member(uuid) from public, anon;
revoke execute on function public.generate_invite_code() from public, anon, authenticated;
revoke execute on function public.create_household(text, text) from public, anon;
revoke execute on function public.join_household(text, text) from public, anon;
revoke execute on function public.set_created_by() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
grant execute on function public.is_member(uuid) to authenticated;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.import_batches enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.receipts enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.savings enable row level security;
alter table public.month_settings enable row level security;

-- Anonymous visitors get nothing at all.
revoke all on all tables in schema public from anon;

-- households: members read and rename their own; insert/delete only via RPC.
create policy "members read household" on public.households
  for select to authenticated using (public.is_member(id));
create policy "members update household" on public.households
  for update to authenticated using (public.is_member(id)) with check (public.is_member(id));
revoke insert, delete on public.households from authenticated;
revoke update on public.households from authenticated;
grant update (name) on public.households to authenticated;

-- household_members: members see each other; each person can change only their own name.
create policy "members read members" on public.household_members
  for select to authenticated using (public.is_member(household_id));
create policy "member updates own name" on public.household_members
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke insert, delete on public.household_members from authenticated;
revoke update on public.household_members from authenticated;
grant update (display_name) on public.household_members to authenticated;

-- Data tables: full access for members of the row's household.
create policy "members manage categories" on public.categories
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage import batches" on public.import_batches
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage recurring expenses" on public.recurring_expenses
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage receipts" on public.receipts
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage expenses" on public.expenses
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage incomes" on public.incomes
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage savings" on public.savings
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
create policy "members manage month settings" on public.month_settings
  for all to authenticated
  using (public.is_member(household_id)) with check (public.is_member(household_id));
