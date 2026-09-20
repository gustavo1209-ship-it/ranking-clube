import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { Users, Tag, Calendar, Swords } from 'lucide-react'
import type { Season } from '@/types'

export default async function AdminDashboardPage() {
  await requireAdmin()
  const supabase = createServiceClient()

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'ativa')
    .maybeSingle<Season>()

  const [{ count: categoriesCount }, { count: profilesCount }, { count: pendingCount }] = await Promise.all([
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    season
      ? supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', season.id).eq('status', 'agendado')
      : Promise.resolve({ count: 0 }),
  ])

  const cards = [
    { label: 'Categorias', value: categoriesCount ?? 0, icon: Tag },
    { label: 'Participantes', value: profilesCount ?? 0, icon: Users },
    { label: 'Jogos pendentes', value: pendingCount ?? 0, icon: Swords },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold">Painel administrativo</h1>
      <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
        <Calendar size={14} />
        {season ? `Temporada ativa: ${season.name}` : 'Nenhuma temporada ativa'}
      </p>

      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {cards.map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <card.icon size={18} className="text-lime-400 mb-2" />
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-sm text-gray-400">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
