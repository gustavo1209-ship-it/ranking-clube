'use client'

import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'

interface Props {
  date: string
}

export function ReservasDatePicker({ date }: Props) {
  const router = useRouter()

  return (
    <label className="relative flex items-center gap-1.5 text-sm text-white font-medium cursor-pointer">
      <Calendar size={14} className="text-lime-400 pointer-events-none" />
      <span className="pointer-events-none">Escolher data</span>
      <input
        type="date"
        value={date}
        onChange={e => {
          if (e.target.value) router.push(`/reservas?data=${e.target.value}`)
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  )
}
