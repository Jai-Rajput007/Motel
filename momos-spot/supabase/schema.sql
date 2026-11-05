-- The Momos Spot: cloud sync table.
-- Paste this whole file into Supabase → SQL Editor → New query → Run. Safe to run more than once.
--
-- Every record from the app (sales, purchases, expenses, …) is stored as one row here.
-- The app works offline from its own database on the phone and syncs here when online.

create table if not exists public.records (
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tbl text not null,
  id text not null,
  data jsonb not null,
  updated_at timestamptz not null,
  deleted boolean not null default false,
  server_updated_at timestamptz not null default clock_timestamp(),
  primary key (owner, tbl, id)
);

create index if not exists records_owner_server_updated on public.records (owner, server_updated_at);
create index if not exists records_owner_tbl on public.records (owner, tbl);

-- Server-side change time (so a wrong phone clock can never hide changes),
-- and an older copy of a record can never overwrite a newer one.
create or replace function public.records_before_write() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.updated_at < old.updated_at then
    return null; -- keep the newer version already stored
  end if;
  new.server_updated_at := clock_timestamp();
  return new;
end $$;

drop trigger if exists records_before_write on public.records;
create trigger records_before_write before insert or update on public.records
for each row execute function public.records_before_write();

-- Only the signed-in owner can read or write their rows.
alter table public.records enable row level security;
drop policy if exists "owner only" on public.records;
create policy "owner only" on public.records
  for all to authenticated
  using (owner = auth.uid())
  with check (owner = auth.uid());

-- Handy read-only views for looking at data in the Supabase table editor.
create or replace view public.sales_view with (security_invoker = true) as
  select (data->>'day')::date as day, data->>'billNo' as bill_no, (data->>'total')::numeric / 100 as total_rs,
         (data->>'cash')::numeric / 100 as cash_rs, (data->>'online')::numeric / 100 as online_rs,
         data->>'status' as status, data->>'at' as at
  from public.records where tbl = 'sales' and not deleted;

create or replace view public.purchases_view with (security_invoker = true) as
  select (data->>'day')::date as day, data->>'itemId' as item_id, (data->>'qty')::numeric as qty, data->>'unit' as unit,
         (data->>'amount')::numeric / 100 as amount_rs, data->>'at' as at
  from public.records where tbl = 'purchases' and not deleted;

create or replace view public.expenses_view with (security_invoker = true) as
  select (data->>'day')::date as day, data->>'name' as name, (data->>'amount')::numeric / 100 as amount_rs,
         data->>'remarks' as remarks, data->>'at' as at
  from public.records where tbl = 'expenses' and not deleted;
