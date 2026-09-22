'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'

export async function updatePlayer(formData: FormData) {
  await requireAdmin()

  const profileId = String(formData.get('id') ?? '')
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!profileId) throw new Error('Jogador inválido.')
  if (!email) throw new Error('Informe um email.')
  if (!fullName) throw new Error('Informe um nome.')

  const supabase = createServiceClient()

  const { data: current } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', profileId)
    .single()

  if (current?.email !== email) {
    const { error: authError } = await supabase.auth.admin.updateUserById(profileId, {
      email,
      email_confirm: true,
    })
    if (authError) throw new Error(`Não foi possível atualizar o email: ${authError.message}`)
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, email })
    .eq('id', profileId)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/jogadores')
}
