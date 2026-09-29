-- Reserva de quadras (A e B), com regras configuráveis pelo admin:
-- duração do horário de jogo, horário de abertura e, por dia da semana,
-- se aceita reserva e até que horário. Rode no SQL Editor do Supabase
-- depois das migrações anteriores. Idempotente.

-- ============ configurações gerais de reserva ============
create table if not exists public.court_booking_settings (
  id text primary key default 'default',
  slot_duration_minutes int not null default 60,
  opening_time time not null default '07:00',
  updated_at timestamptz not null default now(),
  constraint court_booking_settings_singleton check (id = 'default')
);
insert into public.court_booking_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.court_booking_settings enable row level security;
drop policy if exists "config de reserva visível por todos" on public.court_booking_settings;
create policy "config de reserva visível por todos" on public.court_booking_settings for select using (true);

-- ============ configuração por dia da semana ============
-- day_of_week: 0 = domingo ... 6 = sábado (mesma convenção do Date.getDay()).
create table if not exists public.court_booking_days (
  day_of_week int primary key check (day_of_week between 0 and 6),
  enabled boolean not null default true,
  closing_time time not null default '23:59',
  updated_at timestamptz not null default now()
);
insert into public.court_booking_days (day_of_week, closing_time) values
  (0, '20:00'), -- domingo
  (1, '20:00'), -- segunda
  (2, '23:59'), -- terça
  (3, '23:59'), -- quarta
  (4, '23:59'), -- quinta
  (5, '23:59'), -- sexta
  (6, '23:59')  -- sábado
on conflict (day_of_week) do nothing;

alter table public.court_booking_days enable row level security;
drop policy if exists "dias de reserva visíveis por todos" on public.court_booking_days;
create policy "dias de reserva visíveis por todos" on public.court_booking_days for select using (true);

-- ============ reservas ============
create table if not exists public.court_bookings (
  id uuid primary key default gen_random_uuid(),
  court text not null check (court in ('A', 'B')),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (court, booking_date, start_time)
);
create index if not exists court_bookings_date_idx on public.court_bookings (booking_date);

alter table public.court_bookings enable row level security;
drop policy if exists "reservas visíveis por todos" on public.court_bookings;
create policy "reservas visíveis por todos" on public.court_bookings for select using (true);
drop policy if exists "usuário cria a própria reserva" on public.court_bookings;
create policy "usuário cria a própria reserva" on public.court_bookings for insert with check (auth.uid() = profile_id);
drop policy if exists "usuário cancela a própria reserva" on public.court_bookings;
create policy "usuário cancela a própria reserva" on public.court_bookings for delete using (auth.uid() = profile_id);
