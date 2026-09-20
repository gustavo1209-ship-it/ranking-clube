export type SeasonStatus = 'rascunho' | 'ativa' | 'encerrada'
export type MatchStatus = 'agendado' | 'realizado' | 'wo' | 'cancelado'

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
  round_number: number
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
