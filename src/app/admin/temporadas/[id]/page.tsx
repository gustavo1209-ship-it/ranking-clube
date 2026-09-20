import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { GenerateScheduleButton } from '@/components/generate-schedule-button'
import { Users } from 'lucide-react'
import { SEASON_STATUS_LABELS } from '@/types'
import type { Category, Season } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function TemporadaDetalhePage({ params }: Props) {
  await requireAdmin()
  const { id } = await params
  const supabase = createServiceClient()

  const { data: season } = await supabase.from('seasons').select('*').eq('id', id).single<Season>()
  if (!season) notFound()

  const { data: categories } = await supabase.from('categories').select('*').order('sort_order') as { data: Category[] | null }

  const counts = await Promise.all(
    (categories ?? []).map(async cat => {
      const [{ count: enrolled }, { count: matches }] = await Promise.all([
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('season_id', id).eq('category_id', cat.id),
        supabase.from('matches').select('*', { count: 'exact', head: true }).eq('season_id', id).eq('category_id', cat.id),
      ])
      return { categoryId: cat.id, enrolled: enrolled ?? 0, matches: matches ?? 0 }
    })
  )
  const countsByCategory = new Map(counts.map(c => [c.categoryId, c]))

  return (
    <div>
      <h1 className="text-2xl font-bold">{season.name}</h1>
      <p className="text-sm text-gray-400 mt-1">
        {season.start_date} até {season.end_date} · {SEASON_STATUS_LABELS[season.status]}
      </p>

      <div className="mt-6 space-y-3">
        {(categories ?? []).map(cat => {
          const info = countsByCategory.get(cat.id)
          return (
            <div key={cat.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{cat.name}</p>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1"><Users size={13} /> {info?.enrolled ?? 0} inscritos</span>
                  <span>{info?.matches ?? 0} partidas geradas</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/temporadas/${season.id}/participantes?categoria=${cat.id}`}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Gerenciar inscritos
                </Link>
                <GenerateScheduleButton seasonId={season.id} categoryId={cat.id} />
              </div>
            </div>
          )
        })}
        {(categories ?? []).length === 0 && (
          <p className="text-sm text-gray-500">Cadastre categorias antes de gerar jogos.</p>
        )}
      </div>
    </div>
  )
}
