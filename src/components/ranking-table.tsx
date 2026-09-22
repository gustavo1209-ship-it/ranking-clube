import { Trophy } from 'lucide-react'

export interface RankingRow {
  profile_id: string
  name: string
  partidas_jogadas: number
  vitorias: number
  derrotas: number
  sets_pro: number
  sets_contra: number
  games_pro: number
  games_contra: number
  pontos: number
}

interface RankingTableProps {
  rows: RankingRow[]
  currentUserId?: string
}

const RANK_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600']
const RANK_ICONS = ['🥇', '🥈', '🥉']

export function RankingTable({ rows, currentUserId }: RankingTableProps) {
  const sorted = [...rows].sort((a, b) => {
    if (b.pontos !== a.pontos) return b.pontos - a.pontos
    const setDiffA = a.sets_pro - a.sets_contra
    const setDiffB = b.sets_pro - b.sets_contra
    if (setDiffB !== setDiffA) return setDiffB - setDiffA
    const gameDiffA = a.games_pro - a.games_contra
    const gameDiffB = b.games_pro - b.games_contra
    return gameDiffB - gameDiffA
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy size={40} className="mx-auto mb-3 opacity-30" />
        <p>Nenhum participante nesta categoria ainda.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-left">
            <th className="pb-3 pr-4 font-medium w-10">#</th>
            <th className="pb-3 pr-4 font-medium">Nome</th>
            <th className="pb-3 pr-4 font-medium text-center">Pts</th>
            <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">J</th>
            <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">V</th>
            <th className="pb-3 pr-4 font-medium text-center hidden sm:table-cell">D</th>
            <th className="pb-3 font-medium text-center" title="Saldo de sets — critério de desempate">Sets</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800/60">
          {sorted.map((row, index) => {
            const isMe = row.profile_id === currentUserId
            const rank = index + 1
            const rankIcon = RANK_ICONS[index]
            const rankColor = RANK_COLORS[index]

            return (
              <tr
                key={row.profile_id}
                className={`transition-colors ${isMe ? 'bg-lime-500/10' : 'hover:bg-gray-900/50'}`}
              >
                <td className="py-2 pr-4">
                  {index < 3 ? (
                    <span className={`text-base ${rankColor}`}>{rankIcon}</span>
                  ) : (
                    <span className="text-gray-500 font-medium">{rank}</span>
                  )}
                </td>
                <td className="py-2 pr-4">
                  <span className={`font-medium ${isMe ? 'text-lime-400' : 'text-white'}`}>
                    {row.name}
                    {isMe && <span className="ml-1 text-xs text-lime-500">(você)</span>}
                  </span>
                </td>
                <td className="py-2 pr-4 text-center">
                  <span className={`font-bold text-base ${index === 0 ? 'text-yellow-400' : 'text-white'}`}>
                    {row.pontos}
                  </span>
                </td>
                <td className="py-2 pr-4 text-center hidden sm:table-cell text-gray-400">{row.partidas_jogadas}</td>
                <td className="py-2 pr-4 text-center hidden sm:table-cell text-green-400">{row.vitorias}</td>
                <td className="py-2 pr-4 text-center hidden sm:table-cell text-red-400">{row.derrotas}</td>
                <td className="py-2 text-center text-gray-300 font-medium tabular-nums">
                  {row.sets_pro}-{row.sets_contra}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
