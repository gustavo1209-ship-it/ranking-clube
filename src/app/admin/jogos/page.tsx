import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { MATCH_STATUS_LABELS } from '@/types'
import type { Category, Match, Profile, Season } from '@/types'

interface Props {
  searchParams: Promise<{ temporada?: string; categoria?: string; status?: string }>
}

const STATUS_COLORS: Record<string, string> = {
  agendado: 'bg-gray-800 text-gray-400',
  realizado: 'bg-lime-500/20 text-lime-400',
  wo: 'bg-yellow-500/20 text-yellow-400',
  cancelado: 'bg-red-500/20 text-red-400',
}

export default async function AdminJogosPage({ searchParams }: Props) {
  await requireAdmin()
  const { temporada, categoria, status } = await searchParams
  const supabase = createServiceClient()

  const { data: seasons } = await supabase.from('seasons').select('*').order('start_date', { ascending: false }) as { data: Season[] | null }
  const activeSeason = seasons?.find(s => s.status === 'ativa') ?? seasons?.[0]
  const seasonId = temporada ?? activeSeason?.id

  const { data: categories } = await supabase.from('categories').select('*').order('sort_order') as { data: Category[] | null }
  const { data: profiles } = await supabase.from('profiles').select('*') as { data: Profile[] | null }
  const profilesById = new Map((profiles ?? []).map(p => [p.id, p]))

  let query = supabase.from('matches').select('*').order('scheduled_date')
  if (seasonId) query = query.eq('season_id', seasonId)
  if (categoria) query = query.eq('category_id', categoria)
  if (status) query = query.eq('status', status)
  const { data: matches } = await query as { data: Match[] | null }

  const categoriesById = new Map((categories ?? []).map(c => [c.id, c]))

  function nameOf(id: string | null) {
    if (!id) return '—'
    return profilesById.get(id)?.full_name || 'Participante'
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Jogos</h1>

      <div className="flex flex-wrap gap-2 mt-4">
        {(seasons ?? []).map(s => (
          <Link
            key={s.id}
            href={`/admin/jogos?temporada=${s.id}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${seasonId === s.id ? 'bg-lime-500/20 border-lime-500/40 text-lime-400' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <Link
          href={`/admin/jogos?temporada=${seasonId ?? ''}`}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border ${!categoria ? 'bg-lime-500/20 border-lime-500/40 text-lime-400' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
        >
          Todas categorias
        </Link>
        {(categories ?? []).map(cat => (
          <Link
            key={cat.id}
            href={`/admin/jogos?temporada=${seasonId ?? ''}&categoria=${cat.id}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${categoria === cat.id ? 'bg-lime-500/20 border-lime-500/40 text-lime-400' : 'bg-gray-900 border-gray-800 text-gray-400'}`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-left">
              <th className="pb-3 pr-4 font-medium">Categoria</th>
              <th className="pb-3 pr-4 font-medium">Confronto</th>
              <th className="pb-3 pr-4 font-medium">Data</th>
              <th className="pb-3 pr-4 font-medium">Status</th>
              <th className="pb-3 font-medium">Placar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {(matches ?? []).map(match => (
              <tr key={match.id} className="hover:bg-gray-900/50">
                <td className="py-2.5 pr-4 text-gray-400">{categoriesById.get(match.category_id)?.name}</td>
                <td className="py-2.5 pr-4">
                  <Link href={`/admin/jogos/${match.id}`} className="text-white hover:text-lime-400">
                    {nameOf(match.player1_id)} <span className="text-gray-500">vs</span> {nameOf(match.player2_id)}
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-gray-400">{match.scheduled_date}</td>
                <td className="py-2.5 pr-4">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[match.status]}`}>
                    {MATCH_STATUS_LABELS[match.status]}
                  </span>
                </td>
                <td className="py-2.5 text-gray-400">
                  {match.status === 'realizado' ? `${match.sets_pro}-${match.sets_contra}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(matches ?? []).length === 0 && (
          <p className="text-sm text-gray-500 mt-4">Nenhuma partida encontrada.</p>
        )}
      </div>
    </div>
  )
}
