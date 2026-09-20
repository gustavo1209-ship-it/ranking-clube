'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'

export async function createCategory(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') || '').trim()
  const description = String(formData.get('description') || '').trim()
  if (!name) return

  const supabase = createServiceClient()
  const { count } = await supabase.from('categories').select('*', { count: 'exact', head: true })
  await supabase.from('categories').insert({ name, description, sort_order: count ?? 0 })

  revalidatePath('/admin/categorias')
}

export async function deleteCategory(id: string) {
  await requireAdmin()
  const supabase = createServiceClient()
  await supabase.from('categories').delete().eq('id', id)
  revalidatePath('/admin/categorias')
}
