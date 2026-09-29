'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'

interface Props {
  date: string
}

export function ReservasDatePicker({ date }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function openPicker() {
    const input = inputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.focus()
    }
  }

  return (
    <div className="relative flex items-center gap-1.5">
      <button
        type="button"
        onClick={openPicker}
        className="flex items-center gap-1.5 text-sm text-white font-medium hover:text-lime-400 transition-colors"
      >
        <Calendar size={14} className="text-lime-400" />
        Escolher data
      </button>
      <input
        ref={inputRef}
        type="date"
        value={date}
        onChange={e => {
          if (e.target.value) router.push(`/reservas?data=${e.target.value}`)
        }}
        className="absolute left-0 top-0 w-px h-px opacity-0 pointer-events-none"
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  )
}
