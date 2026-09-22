# Ranking Tênis — Caça e Pesca de Veranópolis

Site de ranking de tênis do clube, com múltiplas categorias e sorteio automático
dos confrontos da temporada.

## Stack

- Next.js 16 (App Router) — `src/middleware.ts` roda em Edge runtime (convenção `proxy.ts`
  do Next 16 exige runtime Node.js, incompatível com o Webflow Cloud/OpenNext Cloudflare)
- Supabase — auth + banco PostgreSQL
- Tailwind CSS v4 — tema escuro com accent verde-lima

## Hospedagem — Webflow Cloud

Hospedado como app standalone no Webflow Cloud (subdomínio próprio, sem subrota de outro
site). Deploy configurado em `webflow.com/dashboard/cloud/deploy` → New Project → App →
importar `gustavo1209-ship-it/ranking-clube` do GitHub.

Variáveis de ambiente a cadastrar no painel do Webflow Cloud (Secret Variable para a
`SERVICE_ROLE_KEY`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Não defina `basePath`/`assetPrefix` em `next.config.ts` — o Webflow Cloud gera isso
automaticamente a partir do mount path do ambiente e sobrescreve qualquer valor commitado.

## Comandos

```bash
npm install
npm run dev      # localhost:3000
npm run build
npm run lint
npx tsc --noEmit
```

## Configuração

1. Crie um projeto no Supabase.
2. Rode `supabase/schema.sql` no SQL Editor do projeto (tabelas, RLS, trigger de perfil e view `standings`).
3. Rode `supabase/seed.sql` para criar as categorias iniciais.
4. Copie `.env.local.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Para virar admin, rode no SQL Editor:

```sql
update public.profiles set is_admin = true where email = 'seu@email.com';
```

## Modelo de dados

- `profiles` — um por usuário (criado automaticamente via trigger em `auth.users`).
- `categories` — categorias do ranking (CRUD em `/admin/categorias`).
- `seasons` — temporadas (1 por ano); só uma pode estar `ativa` por vez.
- `enrollments` — quem está inscrito em qual categoria, em qual temporada.
- `matches` — os confrontos gerados, com placar e status.
- view `standings` — classificação agregada por temporada + categoria + participante.

## Algoritmo de sorteio (`src/lib/scheduler.ts`)

Ao clicar em "Gerar jogos" para uma categoria (em `/admin/temporadas/[id]`), o sistema:

1. Busca os participantes inscritos naquela categoria/temporada.
2. Gera o calendário todos-contra-todos pelo método do círculo (round-robin).
3. Embaralha a ordem dos jogadores e das rodadas com um gerador pseudoaleatório
   determinístico (seed = `temporada:categoria`), garantindo que o mesmo sorteio
   sempre produza o mesmo resultado.
4. Distribui as datas das rodadas de forma uniforme entre o início e o fim da
   temporada, com uma pequena variação aleatória (também determinística) para
   não ficar mecânico — sem nunca ultrapassar o período da temporada.

Se a categoria já tiver partidas com resultado lançado, a regeneração é bloqueada
para não apagar histórico.

## Fluxo de uso

1. Admin cria categorias (`/admin/categorias`) e uma temporada (`/admin/temporadas`).
2. Admin ativa a temporada e inscreve participantes por categoria
   (`/admin/temporadas/[id]/participantes`).
3. Admin gera os jogos de cada categoria (`/admin/temporadas/[id]`).
4. Participantes lançam o próprio placar em `/jogos`.
5. Classificação pública em `/ranking`.
