import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { createSeason, activateSeason, finishSeason } from './actions'
import { Plus, ChevronRight } from 'lucide-react'
import { SEASON_STATUS_LABELS } from '@/types'
import type { Season } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  rascunho: 'bg-gray-800 text-gray-400',
  ativa: 'bg-lime-500/20 text-lime-400',
  encerrada: 'bg-gray-800 text-gray-500',
}

export default async function TemporadasPage() {
  await requireAdmin()
  const supabase = createServiceClient()
  const { data: seasons } = await supabase
    .from('seasons')
    .select('*')
    .order('start_date', { ascending: false }) as { data: Season[] | null }

  async function activate(formData: FormData) {
    'use server'
    await activateSeason(String(formData.get('id')))
  }

  async function finish(formData: FormData) {
    'use server'
    await finishSeason(String(formData.get('id')))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Temporadas</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
        <form action={createSeason} className="grid sm:grid-cols-4 gap-3">
          <input
            name="name"
            required
            placeholder="Nome (ex: Temporada 2026)"
            className="sm:col-span-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
          />
          <input
            name="start_date"
            type="date"
            required
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
          />
          <input
            name="end_date"
            type="date"
            required
            className="px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-lime-500"
          />
          <button
            type="submit"
            className="sm:col-span-4 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-lime-500 hover:bg-lime-600 text-gray-950 font-semibold rounded-xl transition-colors"
          >
            <Plus size={16} />
            Criar temporada
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-2">
        {(seasons ?? []).map(season => (
          <div key={season.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <Link href={`/admin/temporadas/${season.id}`} className="flex-1">
              <p className="text-white font-medium">{season.name}</p>
              <p className="text-sm text-gray-500">{season.start_date} até {season.end_date}</p>
            </Link>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[season.status]}`}>
                {SEASON_STATUS_LABELS[season.status]}
              </span>
              {season.status !== 'ativa' && (
                <form action={activate}>
                  <input type="hidden" name="id" value={season.id} />
                  <button type="submit" className="text-xs text-lime-400 hover:text-lime-300 font-medium">
                    Ativar
                  </button>
                </form>
              )}
              {season.status === 'ativa' && (
                <form action={finish}>
                  <input type="hidden" name="id" value={season.id} />
                  <button type="submit" className="text-xs text-gray-500 hover:text-red-400 font-medium">
                    Encerrar
                  </button>
                </form>
              )}
              <Link href={`/admin/temporadas/${season.id}`}>
                <ChevronRight size={18} className="text-gray-600" />
              </Link>
            </div>
          </div>
        ))}
        {(seasons ?? []).length === 0 && (
          <p className="text-sm text-gray-500">Nenhuma temporada cadastrada ainda.</p>
        )}
      </div>
    </div>
  )
}
