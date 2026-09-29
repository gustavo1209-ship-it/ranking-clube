-- Permite configurar, por temporada+categoria, se um jogador pode estar
-- simultaneamente como desafiante em um confronto E como desafiado em
-- outro (regra 11 do regulamento: só há limite de UM desafio ativo por
-- papel, não um limite geral de um desafio por jogador).
-- Rode no SQL Editor do Supabase depois das migrações anteriores. Idempotente.

alter table public.category_ranking_settings
  add column if not exists ladder_allow_simultaneous_challenges boolean not null default true;
