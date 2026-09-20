export interface GeneratedMatch {
  roundNumber: number
  player1Id: string
  player2Id: string
  scheduledDate: string
}

export interface GenerateScheduleInput {
  playerIds: string[]
  seasonStart: string
  seasonEnd: string
  seed: string
}

const DAY_MS = 86400000

function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  let a = seed
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function toUtcDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / DAY_MS)
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Gera o calendário de uma temporada para uma categoria: todos contra todos
 * (método do círculo), com a ordem dos confrontos e as datas sorteadas de
 * forma determinística a partir de `seed` e distribuídas uniformemente entre
 * `seasonStart` e `seasonEnd`.
 */
export function generateSeasonSchedule({
  playerIds,
  seasonStart,
  seasonEnd,
  seed,
}: GenerateScheduleInput): GeneratedMatch[] {
  const uniquePlayers = Array.from(new Set(playerIds))
  if (uniquePlayers.length < 2) return []

  const random = mulberry32(hashSeed(seed))

  const players: (string | null)[] = seededShuffle(uniquePlayers, random)
  if (players.length % 2 !== 0) players.push(null)

  const n = players.length
  const totalRounds = n - 1
  const fixed = players[0]
  let rotating = players.slice(1)

  const rounds: Array<Array<[string, string]>> = []
  for (let r = 0; r < totalRounds; r++) {
    const arrangement = [fixed, ...rotating]
    const pairs: Array<[string, string]> = []
    for (let i = 0; i < n / 2; i++) {
      const a = arrangement[i]
      const b = arrangement[n - 1 - i]
      if (a !== null && b !== null) pairs.push([a, b])
    }
    rounds.push(pairs)
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, rotating.length - 1)]
  }

  const roundOrder = seededShuffle(
    rounds.map((_, index) => index),
    random
  )

  const start = toUtcDate(seasonStart)
  const end = toUtcDate(seasonEnd)
  const totalDays = Math.max(daysBetween(start, end), roundOrder.length)
  const slotSize = totalDays / roundOrder.length

  const result: GeneratedMatch[] = []
  roundOrder.forEach((originalRoundIndex, position) => {
    const slotStart = position * slotSize
    const slotEnd = (position + 1) * slotSize
    const jitterRange = Math.max(slotEnd - slotStart - 1, 0)
    const jitter = jitterRange > 0 ? Math.floor(random() * jitterRange) : 0
    const dayOffset = Math.min(Math.floor(slotStart) + jitter, totalDays)
    const scheduledDate = formatDate(addDays(start, dayOffset))

    for (const [player1Id, player2Id] of rounds[originalRoundIndex]) {
      result.push({ roundNumber: position + 1, player1Id, player2Id, scheduledDate })
    }
  })

  return result
}
