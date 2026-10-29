-- Phase 10: live updates. Realtime respects RLS, so each member only receives rows of their
-- own household.
alter publication supabase_realtime add table public.expenses, public.incomes, public.savings;
