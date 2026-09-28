-- Permite configurar, por temporada+categoria, se um W.O. credita sets/games
-- ao vencedor (em vez de sempre zerar o placar). Rode no SQL Editor do
-- Supabase depois das migrações anteriores. Idempotente.

alter table public.category_ranking_settings
  add column if not exists wo_conta_sets boolean not null default false,
  add column if not exists wo_sets_vencedor int not null default 2,
  add column if not exists wo_games_vencedor int not null default 0;

-- Nenhuma mudança na view standings é necessária: ela já soma sets_pro/
-- sets_contra/games_pro/games_contra diretamente das partidas, então basta
-- a partida de W.O. ser gravada com esses valores (feito pelo app em
-- markWalkover) para o saldo e o bônus por set/game funcionarem também
-- para vitórias por W.O.
