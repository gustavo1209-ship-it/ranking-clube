'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setCourtBookingDay, setCourtBookingGeneral, setCourtName } from './court-actions'
import { WEEKDAY_LABELS, type CourtName } from '@/types'

interface DayRow {
  day_of_week: number
  enabled: boolean
  closing_time: string
}

interface Props {
  initialSlotDuration: number
  initialOpeningTime: string
  initialMaxBookingsPerPlayer: number | null
  initialDays: DayRow[]
  initialNames: Record<CourtName, string>
}

const COURTS: CourtName[] = ['A', 'B']

export function CourtBookingSettingsControl({
  initialSlotDuration,
  initialOpeningTime,
  initialMaxBookingsPerPlayer,
  initialDays,
  initialNames,
}: Props) {
  const router = useRouter()
  const [slotDuration, setSlotDuration] = useState(initialSlotDuration)
  const [openingTime, setOpeningTime] = useState(initialOpeningTime)
  const [maxBookings, setMaxBookings] = useState<number | null>(initialMaxBookingsPerPlayer)
  const [days, setDays] = useState(initialDays)
  const [names, setNames] = useState(initialNames)
  const [savingGeneral, setSavingGeneral] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveGeneral(overrideMax?: number | null) {
    setSavingGeneral(true)
    setMessage(null)
    const result = await setCourtBookingGeneral(slotDuration, openingTime, overrideMax !== undefined ? overrideMax : maxBookings)
    setMessage({ ok: result.ok, text: result.message })
    setSavingGeneral(false)
    if (result.ok) router.refresh()
  }

  async function saveName(court: CourtName) {
    setMessage(null)
    const result = await setCourtName(court, names[court])
    setMessage({ ok: result.ok, text: result.message })
    if (result.ok) router.refresh()
  }

  async function saveDay(day: DayRow) {
    setMessage(null)
    const result = await setCourtBookingDay(day.day_of_week, day.enabled, day.closing_time)
    setMessage({ ok: result.ok, text: result.message })
    if (result.ok) router.refresh()
  }

  function updateDay(dayOfWeek: number, patch: Partial<DayRow>) {
    setDays(prev => prev.map(d => (d.day_of_week === dayOfWeek ? { ...d, ...patch } : d)))
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-white font-medium">Reserva de quadras</h2>
      <p className="text-sm text-gray-500 mt-1">
        Duração de cada horário de jogo, horário de abertura e, por dia da semana, se aceita reserva e até que
        horário.
      </p>

      <div className="flex flex-wrap items-end gap-4 mt-4">
        {COURTS.map(court => (
          <label key={court} className="flex flex-col gap-1 text-xs text-gray-400">
            Nome da quadra {court}
            <input
              type="text"
              value={names[court]}
              onChange={e => setNames(prev => ({ ...prev, [court]: e.target.value }))}
              onBlur={() => saveName(court)}
              maxLength={40}
              className="w-40 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-lime-500"
            />
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-4 mt-4">
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Duração do jogo (min)
          <input
            type="number"
            min={15}
            step={15}
            value={slotDuration}
            onChange={e => setSlotDuration(Math.max(15, Number(e.target.value) || 15))}
            onBlur={() => saveGeneral()}
            disabled={savingGeneral}
            className="w-28 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500 disabled:opacity-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-gray-400">
          Horário de abertura
          <input
            type="time"
            value={openingTime}
            onChange={e => setOpeningTime(e.target.value)}
            onBlur={() => saveGeneral()}
            disabled={savingGeneral}
            className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-lime-500 disabled:opacity-50"
          />
        </label>

        <label className="flex items-center gap-1.5 text-xs text-gray-400 pb-2">
          <input
            type="checkbox"
            checked={maxBookings !== null}
            onChange={e => {
              const next = e.target.checked ? maxBookings ?? 2 : null
              setMaxBookings(next)
              saveGeneral(next)
            }}
            disabled={savingGeneral}
            className="accent-lime-500"
          />
          Limitar reservas ativas por pessoa
        </label>
        {maxBookings !== null && (
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Máximo por pessoa
            <input
              type="number"
              min={1}
              value={maxBookings}
              onChange={e => setMaxBookings(Math.max(1, Number(e.target.value) || 1))}
              onBlur={() => saveGeneral()}
              disabled={savingGeneral}
              className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center focus:outline-none focus:border-lime-500 disabled:opacity-50"
            />
          </label>
        )}
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-gray-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800/80 text-gray-300">
              <th className="text-left font-medium px-3 py-2">Dia</th>
              <th className="text-left font-medium px-3 py-2">Permite reserva</th>
              <th className="text-left font-medium px-3 py-2">Horário limite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {days.map(day => (
              <tr key={day.day_of_week}>
                <td className="px-3 py-2 text-gray-300">{WEEKDAY_LABELS[day.day_of_week]}</td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={e => {
                      const next = { ...day, enabled: e.target.checked }
                      updateDay(day.day_of_week, next)
                      saveDay(next)
                    }}
                    className="accent-lime-500"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    value={day.closing_time}
                    disabled={!day.enabled}
                    onChange={e => updateDay(day.day_of_week, { closing_time: e.target.value })}
                    onBlur={() => saveDay(day)}
                    className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white disabled:opacity-40"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className={`text-xs mt-3 ${message.ok ? 'text-lime-400' : 'text-red-400'}`}>{message.text}</p>}
    </div>
  )
}
