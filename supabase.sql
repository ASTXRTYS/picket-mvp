-- Enable extension for UUIDs (already enabled on Supabase typically)
create extension if not exists pgcrypto;

-- Sites
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  center_lat double precision not null,
  center_lng double precision not null,
  radius_m integer not null default 120,
  created_at timestamptz not null default now()
);

-- Profiles (maps auth.users -> role, name, site)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'worker' check (role in ('worker','admin')),
  site_id uuid references public.sites(id),
  created_at timestamptz not null default now()
);

-- Auto-insert profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Attendances
create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  site_id uuid not null references public.sites(id),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  seconds_inside integer not null default 0,
  last_lat double precision,
  last_lng double precision,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_att_user_day on public.attendances (user_id, started_at);
create index if not exists idx_att_site_day on public.attendances (site_id, started_at);

-- RLS
alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.attendances enable row level security;

-- Sites: anyone authenticated can read; only admins can write (simplified for MVP)
drop policy if exists "read sites" on public.sites;
create policy "read sites" on public.sites for select to authenticated using (true);

drop policy if exists "admin write sites" on public.sites;
create policy "admin write sites" on public.sites for insert with check (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "admin update sites" on public.sites;
create policy "admin update sites" on public.sites for update using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- Profiles: users read own; admins read all; users update own name/site (optional)
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (id = auth.uid());

drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id = auth.uid());

-- Attendances: users can insert/select/update their own rows; admins can select all
drop policy if exists "att self insert" on public.attendances;
create policy "att self insert" on public.attendances for insert with check (user_id = auth.uid());

drop policy if exists "att self read" on public.attendances;
create policy "att self read" on public.attendances for select using (user_id = auth.uid());

drop policy if exists "att admin read" on public.attendances;
create policy "att admin read" on public.attendances for select using (
  exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "att self update" on public.attendances;
create policy "att self update" on public.attendances for update using (user_id = auth.uid());

-- Seed: example site (replace coords)
insert into public.sites (name, center_lat, center_lng, radius_m)
values ('Main Picket Line', 40.7527, -73.9772, 150)
on conflict do nothing;
