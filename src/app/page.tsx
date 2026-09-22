import Link from 'next/link'
import { Trophy, Calendar, Shuffle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getCurrentProfile } from '@/lib/current-profile'
import { Navbar } from '@/components/navbar'
import { BrandMark } from '@/components/brand-mark'
import type { Season } from '@/types'

export default async function HomePage() {
  const supabase = await createClient()
  const profile = await getCurrentProfile()

  const { data: season } = await supabase
    .from('seasons')
    .select('*')
    .eq('status', 'ativa')
    .maybeSingle<Season>()

  return (
    <div className="min-h-screen">
      <Navbar userName={profile?.full_name} isAdmin={profile?.is_admin} />

      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <BrandMark size={64} className="mx-auto" />
        <h1 className="text-3xl sm:text-4xl font-semibold mt-4">
          Ranking Tênis <span className="text-lime-400 italic">Caça e Pesca de Veranópolis</span>
        </h1>
        <p className="text-lime-400/70 text-xs tracking-[0.3em] uppercase mt-2 font-medium">Temporada no saibro</p>
        <p className="text-gray-400 mt-4 max-w-xl mx-auto">
          Acompanhe a classificação por categoria e os confrontos sorteados automaticamente
          ao longo da temporada.
        </p>

        {season ? (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-gray-300 bg-gray-900 border border-gray-800 rounded-full px-4 py-2">
            <Calendar size={14} className="text-lime-400" />
            Temporada ativa: <span className="font-medium text-white">{season.name}</span>
          </p>
        ) : (
          <p className="mt-6 text-sm text-gray-500">Nenhuma temporada ativa no momento.</p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Link
            href="/ranking"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-lime-500 hover:bg-lime-600 text-gray-950 font-semibold rounded-xl transition-colors"
          >
            <Trophy size={18} />
            Ver ranking
          </Link>
          {!profile && (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white font-semibold rounded-xl transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mt-16 text-left">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <Shuffle className="text-lime-400 mb-2" size={20} />
            <h2 className="font-semibold text-white">Sorteio automático</h2>
            <p className="text-sm text-gray-400 mt-1">
              Todos contra todos dentro de cada categoria, com jogos distribuídos ao longo do
              ano de forma sorteada, porém consistente com a duração da temporada.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <Trophy className="text-lime-400 mb-2" size={20} />
            <h2 className="font-semibold text-white">Ranking por categoria</h2>
            <p className="text-sm text-gray-400 mt-1">
              Classificação separada por categoria, atualizada a cada resultado lançado pelos
              próprios participantes.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
