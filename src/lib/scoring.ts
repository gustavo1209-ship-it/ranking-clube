import type { SetScore } from '@/types'

export interface SetSummary {
  setsPro: number
  setsContra: number
  gamesPro: number
  gamesContra: number
  winner: 'p1' | 'p2'
}

export function summarizeSets(sets: SetScore[]): SetSummary {
  let setsPro = 0
  let setsContra = 0
  let gamesPro = 0
  let gamesContra = 0

  for (const set of sets) {
    gamesPro += set.p1
    gamesContra += set.p2
    if (set.p1 > set.p2) setsPro++
    else if (set.p2 > set.p1) setsContra++
  }

  return { setsPro, setsContra, gamesPro, gamesContra, winner: setsPro > setsContra ? 'p1' : 'p2' }
}

export function isValidSetSequence(sets: SetScore[]): boolean {
  const played = sets.filter(s => s.p1 > 0 || s.p2 > 0)
  if (played.length < 2) return false
  const { setsPro, setsContra } = summarizeSets(played)
  return setsPro !== setsContra && (setsPro >= 2 || setsContra >= 2)
}
