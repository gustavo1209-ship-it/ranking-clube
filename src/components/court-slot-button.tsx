'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createBooking, cancelBooking } from '@/app/reservas/actions'
import type { CourtName } from '@/types'

interface Props {
  court: CourtName
  date: string
  slotStart: string
  slotEnd: string
  booking: { id: string; name: string } | null
  canCancel: boolean
  disabledPast: boolean
  loggedIn: boolean
}

export function CourtSlotButton({ court, date, slotStart, slotEnd, booking, canCancel, disabledPast, loggedIn }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleClick() {
    setError('')
    setLoading(true)
    const result = booking ? await cancelBooking(booking.id) : await createBooking(court, date, slotStart)
    if (!result.ok) setError(result.message)
    setLoading(false)
    if (result.ok) router.refresh()
  }

  const clickable = !disabledPast && loggedIn && (booking ? canCancel : true)

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={!clickable || loading}
        className={`w-full flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
          booking
            ? canCancel
              ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
              : 'bg-gray-800/60 border-gray-800 text-gray-500'
            : 'bg-lime-500/10 border-lime-500/20 text-lime-400 hover:bg-lime-500/20'
        }`}
      >
        <span className="flex items-center gap-1.5">
          {loading && <Loader2 size={12} className="animate-spin" />}
          {slotStart} – {slotEnd}
        </span>
        <span className="text-xs font-normal">
          {disabledPast ? 'Encerrado' : booking ? (canCancel ? `${booking.name} · cancelar` : booking.name) : 'Reservar'}
        </span>
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  )
}
