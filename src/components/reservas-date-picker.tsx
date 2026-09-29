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

  function handleClick() {
    // Em navegadores/webviews sem showPicker() (comum em browsers internos
    // de apps, ex. WhatsApp), o próprio toque no input real abaixo já abre
    // o calendário nativo — isso aqui é só um reforço onde showPicker existe.
    const input = inputRef.current
    if (input && typeof input.showPicker === 'function') {
      try {
        input.showPicker()
      } catch {
        // ignora: o toque no input nativo por baixo cobre o caso
      }
    }
  }

  return (
    <div className="relative flex items-center gap-1.5 text-sm text-white font-medium">
      <Calendar size={14} className="text-lime-400 pointer-events-none" />
      <span className="pointer-events-none">Escolher data</span>
      <input
        ref={inputRef}
        type="date"
        value={date}
        onClick={handleClick}
        onChange={e => {
          if (e.target.value) router.push(`/reservas?data=${e.target.value}`)
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label="Escolher data"
      />
    </div>
  )
}
