-- Nomes exibidos para as quadras A e B, editáveis pelo admin. A chave
-- interna ('A'/'B', usada em court_bookings) não muda — só o nome de
-- exibição. Rode no SQL Editor do Supabase depois das migrações
-- anteriores. Idempotente.

create table if not exists public.court_names (
  court text primary key check (court in ('A', 'B')),
  name text not null,
  updated_at timestamptz not null default now()
);
insert into public.court_names (court, name) values
  ('A', 'Quadra A'),
  ('B', 'Quadra B')
on conflict (court) do nothing;

alter table public.court_names enable row level security;
drop policy if exists "nomes de quadra visíveis por todos" on public.court_names;
create policy "nomes de quadra visíveis por todos" on public.court_names for select using (true);
