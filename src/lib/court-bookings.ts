import { createServiceClient } from '@/lib/supabase/service'
import type { CourtBookingDay, CourtName } from '@/types'

type ServiceClient = ReturnType<typeof createServiceClient>

const DAY_MS = 86400000

export const COURTS: CourtName[] = ['A', 'B']

export const DEFAULT_COURT_SETTINGS = {
  slot_duration_minutes: 60,
  opening_time: '07:00',
}

export const DEFAULT_COURT_NAMES: Record<CourtName, string> = {
  A: 'Quadra A',
  B: 'Quadra B',
}

export const DEFAULT_COURT_DAYS: Record<number, { enabled: boolean; closing_time: string }> = {
  0: { enabled: true, closing_time: '20:00' }, // domingo
  1: { enabled: true, closing_time: '20:00' }, // segunda
  2: { enabled: true, closing_time: '23:59' },
  3: { enabled: true, closing_time: '23:59' },
  4: { enabled: true, closing_time: '23:59' },
  5: { enabled: true, closing_time: '23:59' },
  6: { enabled: true, closing_time: '23:59' },
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function addDaysIso(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d) + days * DAY_MS
  return new Date(ms).toISOString().slice(0, 10)
}

export function dayOfWeekOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay()
}

export function nowHHMM(): string {
  return new Date().toISOString().slice(11, 16)
}

export async function getCourtBookingSettings(supabase: ServiceClient) {
  const { data } = await supabase.from('court_booking_settings').select('*').eq('id', 'default').maybeSingle()
  return {
    slot_duration_minutes: data?.slot_duration_minutes ?? DEFAULT_COURT_SETTINGS.slot_duration_minutes,
    opening_time: (data?.opening_time ?? DEFAULT_COURT_SETTINGS.opening_time).slice(0, 5),
  }
}

export async function getCourtBookingDays(supabase: ServiceClient) {
  const { data } = await supabase.from('court_booking_days').select('*').order('day_of_week')
  const byDay = new Map((data ?? []).map((d: CourtBookingDay) => [d.day_of_week, d]))
  return Array.from({ length: 7 }, (_, day) => {
    const row = byDay.get(day)
    const fallback = DEFAULT_COURT_DAYS[day]
    return {
      day_of_week: day,
      enabled: row?.enabled ?? fallback.enabled,
      closing_time: (row?.closing_time ?? fallback.closing_time).slice(0, 5),
    }
  })
}

export async function getCourtNames(supabase: ServiceClient): Promise<Record<CourtName, string>> {
  const { data } = await supabase.from('court_names').select('*')
  const byCourt = new Map((data ?? []).map((row: { court: CourtName; name: string }) => [row.court, row.name]))
  return {
    A: byCourt.get('A') ?? DEFAULT_COURT_NAMES.A,
    B: byCourt.get('B') ?? DEFAULT_COURT_NAMES.B,
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export interface TimeSlot {
  start: string
  end: string
}

/**
 * Gera os horários fixos do dia a partir de `openingTime`, em blocos de
 * `durationMinutes`, incluindo apenas os que terminam até `closingTime`.
 * closingTime = '23:59' na prática libera o último horário cheio antes da
 * meia-noite (ex.: com jogos de 60min, o último começa às 22:00).
 */
export function generateSlots(openingTime: string, closingTime: string, durationMinutes: number): TimeSlot[] {
  const slots: TimeSlot[] = []
  if (durationMinutes <= 0) return slots
  const closing = toMinutes(closingTime)
  let start = toMinutes(openingTime)
  while (start + durationMinutes <= closing) {
    slots.push({ start: toHHMM(start), end: toHHMM(start + durationMinutes) })
    start += durationMinutes
  }
  return slots
}
