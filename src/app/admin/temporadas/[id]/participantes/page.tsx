import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { enroll, unenroll } from './actions'
import { UserPlus, UserMinus } from 'lucide-react'
import type { Category, Profile, Season } from '@/types'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ categoria?: string }>
}

export default async function ParticipantesPage({ params, searchParams }: Props) {
  await requireAdmin()
  const { id: seasonId } = await params
  const { categoria } = await searchParams
  const supabase = createServiceClient()

  const { data: season } = await supabase.from('seasons').select('*').eq('id', seasonId).single<Season>()
  if (!season) notFound()

  const { data: categories } = await supabase.from('categories').select('*').order('sort_order') as { data: Category[] | null }
  const categoryId = categoria ?? categories?.[0]?.id
  const { data: profiles } = await supabase.from('profiles').select('*').order('full_name') as { data: Profile[] | null }

  const { data: enrollments } = categoryId
    ? await supabase.from('enrollments').select('profile_id').eq('season_id', seasonId).eq('category_id', categoryId)
    : { data: [] }

  const enrolledIds = new Set((enrollments ?? []).map(e => e.profile_id))

  async function toggle(formData: FormData) {
    'use server'
    const profileId = String(formData.get('profile_id'))
    const catId = String(formData.get('category_id'))
    const isEnrolled = formData.get('enrolled') === '1'
    if (isEnrolled) {
      await unenroll(seasonId, catId, profileId)
    } else {
      await enroll(seasonId, catId, profileId)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Inscrições — {season.name}</h1>

      <div className="flex flex-wrap gap-2 mt-4">
        {(categories ?? []).map(cat => (
          <Link
            key={cat.id}
            href={`/admin/temporadas/${seasonId}/participantes?categoria=${cat.id}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              categoryId === cat.id
                ? 'bg-lime-500/20 border-lime-500/40 text-lime-400'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {(profiles ?? []).map(profile => {
          const isEnrolled = enrolledIds.has(profile.id)
          return (
            <div key={profile.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
              <div>
                <p className="text-white font-medium">{profile.full_name || profile.email}</p>
                <p className="text-sm text-gray-500">{profile.email}</p>
              </div>
              <form action={toggle}>
                <input type="hidden" name="profile_id" value={profile.id} />
                <input type="hidden" name="category_id" value={categoryId} />
                <input type="hidden" name="enrolled" value={isEnrolled ? '1' : '0'} />
                <button
                  type="submit"
                  className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    isEnrolled
                      ? 'text-red-400 hover:bg-red-500/10'
                      : 'text-lime-400 hover:bg-lime-500/10'
                  }`}
                >
                  {isEnrolled ? <UserMinus size={14} /> : <UserPlus size={14} />}
                  {isEnrolled ? 'Remover' : 'Inscrever'}
                </button>
              </form>
            </div>
          )
        })}
        {(profiles ?? []).length === 0 && (
          <p className="text-sm text-gray-500">Nenhum participante cadastrado ainda.</p>
        )}
      </div>
    </div>
  )
}
