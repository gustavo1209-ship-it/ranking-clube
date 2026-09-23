-- Ranking Tênis — Caça e Pesca de Veranópolis
-- Schema completo: tabelas, RLS, trigger de perfil e view de classificação.

create extension if not exists "pgcrypto";

-- ============ profiles ============
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  phone text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles são visíveis por todos"
  on public.profiles for select
  using (true);

create policy "usuário edita o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "usuário cria o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============ categories ============
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

create policy "categorias são visíveis por todos"
  on public.categories for select
  using (true);

-- ============ seasons ============
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'ativa', 'encerrada')),
  created_at timestamptz not null default now()
);

create unique index seasons_uma_ativa_idx on public.seasons (status) where status = 'ativa';

alter table public.seasons enable row level security;

create policy "temporadas são visíveis por todos"
  on public.seasons for select
  using (true);

-- ============ enrollments ============
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (season_id, category_id, profile_id)
);

alter table public.enrollments enable row level security;

create policy "inscrições são visíveis por todos"
  on public.enrollments for select
  using (true);

-- ============ matches ============
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  round_number int not null,
  player1_id uuid references public.profiles (id),
  player2_id uuid references public.profiles (id),
  scheduled_date date not null,
  status text not null default 'agendado' check (status in ('agendado', 'realizado', 'wo', 'cancelado')),
  sets jsonb,
  sets_pro int not null default 0,
  sets_contra int not null default 0,
  games_pro int not null default 0,
  games_contra int not null default 0,
  winner_id uuid references public.profiles (id),
  reported_by uuid references public.profiles (id),
  reported_at timestamptz,
  created_at timestamptz not null default now()
);

create index matches_season_category_idx on public.matches (season_id, category_id);

alter table public.matches enable row level security;

create policy "partidas são visíveis por todos"
  on public.matches for select
  using (true);

create policy "jogador lança o placar da própria partida"
  on public.matches for update
  using (auth.uid() = player1_id or auth.uid() = player2_id)
  with check (auth.uid() = player1_id or auth.uid() = player2_id);

-- ============ standings (view) ============
create view public.standings as
with lados as (
  select
    season_id, category_id, player1_id as profile_id,
    (status = 'realizado' and winner_id = player1_id) as venceu,
    sets_pro, sets_contra, games_pro, games_contra,
    status
  from public.matches
  where player1_id is not null
  union all
  select
    season_id, category_id, player2_id as profile_id,
    (status = 'realizado' and winner_id = player2_id) as venceu,
    sets_contra as sets_pro, sets_pro as sets_contra,
    games_contra as games_pro, games_pro as games_contra,
    status
  from public.matches
  where player2_id is not null
)
select
  season_id,
  category_id,
  profile_id,
  count(*) filter (where status = 'realizado') as partidas_jogadas,
  count(*) filter (where status = 'realizado' and venceu) as vitorias,
  count(*) filter (where status = 'realizado' and not venceu) as derrotas,
  coalesce(sum(sets_pro) filter (where status = 'realizado'), 0) as sets_pro,
  coalesce(sum(sets_contra) filter (where status = 'realizado'), 0) as sets_contra,
  coalesce(sum(games_pro) filter (where status = 'realizado'), 0) as games_pro,
  coalesce(sum(games_contra) filter (where status = 'realizado'), 0) as games_contra,
  count(*) filter (where status = 'realizado' and venceu) * 3 as pontos
from lados
group by season_id, category_id, profile_id;

-- ============ ranking por escada (ladder) ============
-- Modelo alternativo de classificação, configurável por temporada+categoria.
-- Ausência de linha em category_ranking_settings equivale a ranking_model = 'pontos'
-- (o comportamento padrão acima permanece inalterado).

create table public.category_ranking_settings (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  ranking_model text not null default 'pontos' check (ranking_model in ('pontos', 'escada')),
  ladder_max_challenge_gap int not null default 3,
  ladder_days_to_play int not null default 10,
  ladder_rematch_days int not null default 7,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, category_id)
);
alter table public.category_ranking_settings enable row level security;
create policy "config de ranking visível por todos" on public.category_ranking_settings for select using (true);

create table public.ladder_positions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  position int not null,
  player_status text not null default 'ativo' check (player_status in ('ativo', 'inativo', 'afastado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, category_id, profile_id),
  unique (season_id, category_id, position)
);
alter table public.ladder_positions enable row level security;
create policy "posições da escada visíveis por todos" on public.ladder_positions for select using (true);

create table public.ladder_challenges (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  challenger_id uuid not null references public.profiles (id),
  challenged_id uuid not null references public.profiles (id),
  challenger_position_at int not null,
  challenged_position_at int not null,
  status text not null default 'aguardando_aceite' check (status in
    ('aguardando_aceite', 'aceito', 'agendado', 'concluido', 'cancelado', 'wo', 'expirado')),
  match_id uuid references public.matches (id) on delete set null,
  deadline date not null,
  decided_at timestamptz,
  winner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ladder_challenges_season_category_idx on public.ladder_challenges (season_id, category_id);
alter table public.ladder_challenges enable row level security;
create policy "desafios visíveis por todos" on public.ladder_challenges for select using (true);

create table public.ladder_position_history (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  profile_id uuid not null references public.profiles (id),
  previous_position int,
  new_position int not null,
  opponent_id uuid references public.profiles (id),
  challenge_id uuid references public.ladder_challenges (id) on delete set null,
  match_id uuid references public.matches (id) on delete set null,
  reason text not null default 'desafio' check (reason in ('desafio', 'entrada', 'retorno', 'ajuste_admin')),
  created_at timestamptz not null default now()
);
alter table public.ladder_position_history enable row level security;
create policy "histórico da escada visível por todos" on public.ladder_position_history for select using (true);

alter table public.matches add column challenge_id uuid references public.ladder_challenges (id) on delete set null;
alter table public.matches alter column round_number drop not null;

-- ============ pedidos de remarcação de data ============
-- Um jogador propõe uma nova data para uma partida agendada; a data só
-- muda de fato quando o adversário aceita.

create table public.match_reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  proposed_by uuid not null references public.profiles (id),
  proposed_date date not null,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'cancelado')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index match_reschedule_requests_match_idx on public.match_reschedule_requests (match_id);
alter table public.match_reschedule_requests enable row level security;
create policy "pedidos de remarcação visíveis por todos"
  on public.match_reschedule_requests for select
  using (true);
