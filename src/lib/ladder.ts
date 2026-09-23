import { createServiceClient } from '@/lib/supabase/service'
import type { CategoryRankingSettings, LadderChallenge, LadderChallengeStatus, LadderPosition, RankingModel } from '@/types'

type ServiceClient = ReturnType<typeof createServiceClient>

const DAY_MS = 86400000

export const DEFAULT_LADDER_SETTINGS = {
  ranking_model: 'pontos' as RankingModel,
  ladder_max_challenge_gap: 3,
  ladder_days_to_play: 10,
  ladder_rematch_days: 7,
}

const ACTIVE_CHALLENGE_STATUSES: LadderChallengeStatus[] = ['aguardando_aceite', 'aceito', 'agendado']

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(days: number): string {
  return new Date(Date.now() + days * DAY_MS).toISOString().slice(0, 10)
}

export async function getRankingSettings(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string
): Promise<CategoryRankingSettings | null> {
  const { data } = await supabase
    .from('category_ranking_settings')
    .select('*')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .maybeSingle()
  return (data as CategoryRankingSettings | null) ?? null
}

export function settingsWithDefaults(settings: CategoryRankingSettings | null) {
  return {
    ranking_model: settings?.ranking_model ?? DEFAULT_LADDER_SETTINGS.ranking_model,
    ladder_max_challenge_gap: settings?.ladder_max_challenge_gap ?? DEFAULT_LADDER_SETTINGS.ladder_max_challenge_gap,
    ladder_days_to_play: settings?.ladder_days_to_play ?? DEFAULT_LADDER_SETTINGS.ladder_days_to_play,
    ladder_rematch_days: settings?.ladder_rematch_days ?? DEFAULT_LADDER_SETTINGS.ladder_rematch_days,
  }
}

/**
 * Marca um desafio como W.O. a favor de `winnerId`: se for o desafiante,
 * ele assume a posição do desafiado (mesma lógica de uma vitória normal);
 * se for o desafiado, ninguém muda de posição. Usada tanto pelo vencimento
 * automático do prazo quanto por recusa explícita e pelo W.O. manual do
 * admin.
 */
export async function applyLadderWalkover(
  supabase: ServiceClient,
  challenge: LadderChallenge,
  winnerId: string
) {
  if (winnerId === challenge.challenger_id) {
    const { data: challengedPos } = await supabase
      .from('ladder_positions')
      .select('position')
      .eq('season_id', challenge.season_id)
      .eq('category_id', challenge.category_id)
      .eq('profile_id', challenge.challenged_id)
      .maybeSingle()

    if (challengedPos) {
      await movePlayerToPosition(supabase, {
        seasonId: challenge.season_id,
        categoryId: challenge.category_id,
        profileId: challenge.challenger_id,
        newPosition: challengedPos.position,
        opponentId: challenge.challenged_id,
        challengeId: challenge.id,
        reason: 'desafio',
      })
    }
  }

  const now = new Date().toISOString()
  await supabase
    .from('ladder_challenges')
    .update({ status: 'wo', winner_id: winnerId, decided_at: now, updated_at: now })
    .eq('id', challenge.id)
}

/**
 * Resolve automaticamente como W.O. (a favor do desafiante) os desafios
 * cujo prazo passou sem o desafiado aceitar. Desafios já 'agendado' (com
 * partida criada) não são resolvidos aqui — se a partida não acontecer,
 * isso é tratado pelo fluxo normal de partidas (admin marca W.O./cancelado
 * em /admin/jogos).
 */
export async function expireOverdueLadderChallenges(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string
) {
  const { data: overdue } = await supabase
    .from('ladder_challenges')
    .select('*')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .in('status', ['aguardando_aceite', 'aceito'])
    .lt('deadline', todayIso())

  for (const challenge of (overdue ?? []) as LadderChallenge[]) {
    await applyLadderWalkover(supabase, challenge, challenge.challenger_id)
  }
}

export async function hasActiveChallenge(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string,
  profileId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('ladder_challenges')
    .select('id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .in('status', ACTIVE_CHALLENGE_STATUSES)
    .or(`challenger_id.eq.${profileId},challenged_id.eq.${profileId}`)
    .limit(1)
  return (data ?? []).length > 0
}

/**
 * Data (YYYY-MM-DD) em que a revanche entre dois jogadores volta a ser
 * permitida, ou null se não houver bloqueio ativo no momento.
 */
export async function getRematchAvailableDate(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string,
  playerA: string,
  playerB: string,
  rematchDays: number
): Promise<string | null> {
  const { data } = await supabase
    .from('ladder_challenges')
    .select('decided_at')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .in('status', ['concluido', 'wo'])
    .or(`and(challenger_id.eq.${playerA},challenged_id.eq.${playerB}),and(challenger_id.eq.${playerB},challenged_id.eq.${playerA})`)
    .not('decided_at', 'is', null)
    .order('decided_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data?.decided_at) return null
  const availableAt = new Date(data.decided_at).getTime() + rematchDays * DAY_MS
  if (availableAt <= Date.now()) return null
  return new Date(availableAt).toISOString().slice(0, 10)
}

export function eligibleChallengeTargetPositions(myPosition: number, maxGap: number): number[] {
  const targets: number[] = []
  for (let p = myPosition - 1; p >= Math.max(1, myPosition - maxGap); p--) targets.push(p)
  return targets
}

interface MovePlayerInput {
  seasonId: string
  categoryId: string
  profileId: string
  newPosition: number
  opponentId?: string | null
  challengeId?: string | null
  matchId?: string | null
  reason: 'desafio' | 'entrada' | 'retorno' | 'ajuste_admin'
}

/**
 * Move um jogador para `newPosition` por inserção: todos entre a posição
 * antiga e a nova são deslocados em 1. Usa um passo intermediário com
 * posições negativas únicas para evitar violar a constraint unique
 * (season_id, category_id, position) enquanto reordena.
 */
export async function movePlayerToPosition(supabase: ServiceClient, input: MovePlayerInput) {
  const { seasonId, categoryId, profileId, newPosition, opponentId, challengeId, matchId, reason } = input

  const { data } = await supabase
    .from('ladder_positions')
    .select('*')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .order('position')
  const rows = (data ?? []) as LadderPosition[]

  const mover = rows.find(r => r.profile_id === profileId)
  if (!mover) throw new Error('Jogador não está na escada desta temporada/categoria.')
  const oldPosition = mover.position
  if (oldPosition === newPosition) return

  const lo = Math.min(oldPosition, newPosition)
  const hi = Math.max(oldPosition, newPosition)
  const affected = rows.filter(r => r.position >= lo && r.position <= hi)

  for (const r of affected) {
    await supabase.from('ladder_positions').update({ position: -(r.position) - 1 }).eq('id', r.id)
  }

  const now = new Date().toISOString()
  const historyRows = affected.map(r => {
    const target = r.profile_id === profileId
      ? newPosition
      : oldPosition > newPosition
        ? r.position + 1
        : r.position - 1
    return { r, target }
  })

  for (const { r, target } of historyRows) {
    await supabase.from('ladder_positions').update({ position: target, updated_at: now }).eq('id', r.id)
  }

  await supabase.from('ladder_position_history').insert(
    historyRows.map(({ r, target }) => ({
      season_id: seasonId,
      category_id: categoryId,
      profile_id: r.profile_id,
      previous_position: r.position,
      new_position: target,
      opponent_id: r.profile_id === profileId ? (opponentId ?? null) : profileId,
      challenge_id: challengeId ?? null,
      match_id: matchId ?? null,
      reason,
    }))
  )
}

/**
 * Chamada depois que uma partida é reportada (ou corrigida) como
 * 'realizado'. Se a partida não vier de um desafio de escada (challenge_id
 * nulo), não faz nada — o modelo de pontos permanece intacto.
 *
 * Se o desafio já estava concluído com o MESMO vencedor, não faz nada
 * (idempotente — evita mover posições de novo ao só corrigir o placar).
 * Se já estava concluído com um vencedor DIFERENTE (o admin corrigiu quem
 * realmente venceu), desfaz a movimentação anterior antes de aplicar a
 * nova, usando as posições atuais dos jogadores (não um snapshot antigo).
 */
export async function applyLadderChallengeResult(matchId: string) {
  const supabase = createServiceClient()

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single()
  if (!match || !match.challenge_id) return

  const { data: challenge } = await supabase
    .from('ladder_challenges')
    .select('*')
    .eq('id', match.challenge_id)
    .single()
  if (!challenge) return

  const alreadyResolved = challenge.status === 'concluido' || challenge.status === 'wo'
  if (alreadyResolved && challenge.winner_id === match.winner_id) return

  if (alreadyResolved && challenge.winner_id && challenge.winner_id !== match.winner_id) {
    if (challenge.winner_id === challenge.challenger_id) {
      await movePlayerToPosition(supabase, {
        seasonId: challenge.season_id,
        categoryId: challenge.category_id,
        profileId: challenge.challenger_id,
        newPosition: challenge.challenger_position_at,
        opponentId: challenge.challenged_id,
        challengeId: challenge.id,
        matchId: match.id,
        reason: 'ajuste_admin',
      })
    }
  }

  if (match.winner_id === challenge.challenger_id) {
    const { data: challengedPos } = await supabase
      .from('ladder_positions')
      .select('position')
      .eq('season_id', challenge.season_id)
      .eq('category_id', challenge.category_id)
      .eq('profile_id', challenge.challenged_id)
      .maybeSingle()

    if (challengedPos) {
      await movePlayerToPosition(supabase, {
        seasonId: challenge.season_id,
        categoryId: challenge.category_id,
        profileId: challenge.challenger_id,
        newPosition: challengedPos.position,
        opponentId: challenge.challenged_id,
        challengeId: challenge.id,
        matchId: match.id,
        reason: 'desafio',
      })
    }
  }

  const now = new Date().toISOString()
  await supabase
    .from('ladder_challenges')
    .update({ status: 'concluido', winner_id: match.winner_id, decided_at: challenge.decided_at ?? now, updated_at: now })
    .eq('id', challenge.id)
}

export async function appendToLadderBottom(
  supabase: ServiceClient,
  seasonId: string,
  categoryId: string,
  profileId: string,
  reason: 'entrada' | 'retorno' = 'entrada'
) {
  const { data: existing } = await supabase
    .from('ladder_positions')
    .select('id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .eq('profile_id', profileId)
    .maybeSingle()
  if (existing) return

  const { data: maxRow } = await supabase
    .from('ladder_positions')
    .select('position')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPosition = (maxRow?.position ?? 0) + 1

  await supabase
    .from('ladder_positions')
    .insert({ season_id: seasonId, category_id: categoryId, profile_id: profileId, position: nextPosition })

  await supabase.from('ladder_position_history').insert({
    season_id: seasonId,
    category_id: categoryId,
    profile_id: profileId,
    previous_position: null,
    new_position: nextPosition,
    opponent_id: null,
    challenge_id: null,
    match_id: null,
    reason,
  })
}

/**
 * Semeia a escada inteira a partir das inscrições atuais (ordem de inscrição).
 * Só pode ser chamada uma vez — falha se já houver posições registradas.
 */
export async function initLadderPositions(supabase: ServiceClient, seasonId: string, categoryId: string): Promise<number> {
  const { data: existing } = await supabase
    .from('ladder_positions')
    .select('id')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .limit(1)
  if (existing && existing.length > 0) throw new Error('A escada já foi iniciada para esta categoria/temporada.')

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('profile_id, created_at')
    .eq('season_id', seasonId)
    .eq('category_id', categoryId)
    .order('created_at')
  const playerIds = (enrollments ?? []).map(e => e.profile_id as string)
  if (playerIds.length < 2) throw new Error('É preciso pelo menos 2 inscritos para iniciar a escada.')

  const rows = playerIds.map((profileId, index) => ({
    season_id: seasonId,
    category_id: categoryId,
    profile_id: profileId,
    position: index + 1,
  }))
  await supabase.from('ladder_positions').insert(rows)

  await supabase.from('ladder_position_history').insert(
    rows.map(r => ({
      season_id: seasonId,
      category_id: categoryId,
      profile_id: r.profile_id,
      previous_position: null,
      new_position: r.position,
      opponent_id: null,
      challenge_id: null,
      match_id: null,
      reason: 'entrada' as const,
    }))
  )

  return rows.length
}
