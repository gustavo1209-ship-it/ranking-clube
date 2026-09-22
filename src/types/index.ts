export type SeasonStatus = 'rascunho' | 'ativa' | 'encerrada'
export type MatchStatus = 'agendado' | 'realizado' | 'wo' | 'cancelado'
export type RankingModel = 'pontos' | 'escada'
export type LadderPlayerStatus = 'ativo' | 'inativo' | 'afastado'
export type LadderChallengeStatus =
  | 'aguardando_aceite'
  | 'aceito'
  | 'agendado'
  | 'concluido'
  | 'cancelado'
  | 'wo'
  | 'expirado'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_admin: boolean
  created_at: string
}

export interface Category {
  id: string
  name: string
  description: string | null
  sort_order: number
  created_at: string
}

export interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
  status: SeasonStatus
  created_at: string
}

export interface Enrollment {
  id: string
  season_id: string
  category_id: string
  profile_id: string
  created_at: string
}

export interface SetScore {
  p1: number
  p2: number
}

export interface Match {
  id: string
  season_id: string
  category_id: string
  round_number: number | null
  player1_id: string | null
  player2_id: string | null
  scheduled_date: string
  status: MatchStatus
  sets: SetScore[] | null
  sets_pro: number
  sets_contra: number
  games_pro: number
  games_contra: number
  winner_id: string | null
  reported_by: string | null
  reported_at: string | null
  challenge_id: string | null
  created_at: string
}

export interface Standing {
  season_id: string
  category_id: string
  profile_id: string
  partidas_jogadas: number
  vitorias: number
  derrotas: number
  sets_pro: number
  sets_contra: number
  games_pro: number
  games_contra: number
  pontos: number
}

export interface CategoryRankingSettings {
  id: string
  season_id: string
  category_id: string
  ranking_model: RankingModel
  ladder_max_challenge_gap: number
  ladder_days_to_play: number
  ladder_rematch_days: number
  created_at: string
  updated_at: string
}

export interface LadderPosition {
  id: string
  season_id: string
  category_id: string
  profile_id: string
  position: number
  player_status: LadderPlayerStatus
  created_at: string
  updated_at: string
}

export interface LadderChallenge {
  id: string
  season_id: string
  category_id: string
  challenger_id: string
  challenged_id: string
  challenger_position_at: number
  challenged_position_at: number
  status: LadderChallengeStatus
  match_id: string | null
  deadline: string
  decided_at: string | null
  created_at: string
  updated_at: string
}

export interface LadderPositionHistory {
  id: string
  season_id: string
  category_id: string
  profile_id: string
  previous_position: number | null
  new_position: number
  opponent_id: string | null
  challenge_id: string | null
  match_id: string | null
  reason: 'desafio' | 'entrada' | 'retorno' | 'ajuste_admin'
  created_at: string
}

export const SEASON_STATUS_LABELS: Record<SeasonStatus, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  encerrada: 'Encerrada',
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  wo: 'W.O.',
  cancelado: 'Cancelado',
}

export const RANKING_MODEL_LABELS: Record<RankingModel, string> = {
  pontos: 'Pontuação',
  escada: 'Escada',
}

export const LADDER_PLAYER_STATUS_LABELS: Record<LadderPlayerStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  afastado: 'Afastado',
}

export const LADDER_CHALLENGE_STATUS_LABELS: Record<LadderChallengeStatus, string> = {
  aguardando_aceite: 'Aguardando aceite',
  aceito: 'Aceito',
  agendado: 'Agendado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  wo: 'W.O.',
  expirado: 'Expirado',
}
