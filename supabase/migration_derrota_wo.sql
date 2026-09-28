-- Diferencia pontos de derrota por W.O. dos pontos de derrota normal.
-- Rode este arquivo no SQL Editor do Supabase depois de
-- migration_regras_pontuacao.sql já aplicado. Idempotente.

alter table public.category_ranking_settings
  add column if not exists pontos_derrota_wo int not null default 0;

create or replace view public.standings as
with lados as (
  select
    season_id, category_id, player1_id as profile_id, winner_id, status,
    sets_pro, sets_contra, games_pro, games_contra
  from public.matches
  where player1_id is not null
  union all
  select
    season_id, category_id, player2_id as profile_id, winner_id, status,
    sets_contra as sets_pro, sets_pro as sets_contra,
    games_contra as games_pro, games_pro as games_contra
  from public.matches
  where player2_id is not null
),
elegiveis as (
  select
    l.*,
    (status = 'wo') as foi_wo,
    (winner_id = profile_id) as venceu
  from lados l
  where status = 'realizado' or (status = 'wo' and winner_id is not null)
),
pontuado as (
  select
    e.*,
    coalesce(crs.pontos_vitoria, 3) as pontos_vitoria,
    coalesce(crs.pontos_derrota, 0) as pontos_derrota,
    coalesce(crs.pontos_vitoria_wo, 3) as pontos_vitoria_wo,
    coalesce(crs.pontos_derrota_wo, 0) as pontos_derrota_wo,
    coalesce(crs.pontos_bonus_set, 0) as pontos_bonus_set,
    coalesce(crs.pontos_bonus_game, 0) as pontos_bonus_game
  from elegiveis e
  left join public.category_ranking_settings crs
    on crs.season_id = e.season_id and crs.category_id = e.category_id
)
select
  season_id,
  category_id,
  profile_id,
  count(*) as partidas_jogadas,
  count(*) filter (where venceu) as vitorias,
  count(*) filter (where not venceu) as derrotas,
  coalesce(sum(sets_pro), 0) as sets_pro,
  coalesce(sum(sets_contra), 0) as sets_contra,
  coalesce(sum(games_pro), 0) as games_pro,
  coalesce(sum(games_contra), 0) as games_contra,
  sum(
    case
      when foi_wo and venceu then pontos_vitoria_wo
      when foi_wo and not venceu then pontos_derrota_wo
      when venceu then pontos_vitoria + pontos_bonus_set * sets_pro + pontos_bonus_game * games_pro
      else pontos_derrota + pontos_bonus_set * sets_pro + pontos_bonus_game * games_pro
    end
  ) as pontos
from pontuado
group by season_id, category_id, profile_id;
