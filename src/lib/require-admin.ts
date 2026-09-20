import { getCurrentProfile } from '@/lib/current-profile'
import type { Profile } from '@/types'

export async function requireAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile()
  if (!profile?.is_admin) throw new Error('Não autorizado.')
  return profile
}
