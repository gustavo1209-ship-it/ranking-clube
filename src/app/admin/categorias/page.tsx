import { createServiceClient } from '@/lib/supabase/service'
import { requireAdmin } from '@/lib/require-admin'
import { createCategory, deleteCategory } from './actions'
import { Plus, Trash2 } from 'lucide-react'
import type { Category } from '@/types'

export default async function CategoriasPage() {
  await requireAdmin()
  const supabase = createServiceClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order') as { data: Category[] | null }

  async function remove(formData: FormData) {
    'use server'
    await deleteCategory(String(formData.get('id')))
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Categorias</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mt-6">
        <form action={createCategory} className="flex flex-col sm:flex-row gap-3">
          <input
            name="name"
            required
            placeholder="Nome da categoria (ex: Masculino A)"
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
          />
          <input
            name="description"
            placeholder="Descrição (opcional)"
            className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-lime-500"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-lime-500 hover:bg-lime-600 text-gray-950 font-semibold rounded-xl transition-colors"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </form>
      </div>

      <div className="mt-6 space-y-2">
        {(categories ?? []).map(cat => (
          <div key={cat.id} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">
            <div>
              <p className="text-white font-medium">{cat.name}</p>
              {cat.description && <p className="text-sm text-gray-500">{cat.description}</p>}
            </div>
            <form action={remove}>
              <input type="hidden" name="id" value={cat.id} />
              <button type="submit" className="text-gray-500 hover:text-red-400 transition-colors">
                <Trash2 size={16} />
              </button>
            </form>
          </div>
        ))}
        {(categories ?? []).length === 0 && (
          <p className="text-sm text-gray-500">Nenhuma categoria cadastrada ainda.</p>
        )}
      </div>
    </div>
  )
}
