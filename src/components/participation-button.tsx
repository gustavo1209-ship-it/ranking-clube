import Link from 'next/link'
import { Check, UserPlus } from 'lucide-react'

interface Props {
  joined: boolean
  variant?: 'hero' | 'compact'
}

export function ParticipationButton({ joined, variant = 'compact' }: Props) {
  const sizing =
    variant === 'hero'
      ? 'px-6 py-3 rounded-xl'
      : 'px-3.5 py-1.5 text-sm rounded-full'

  const style = joined
    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
    : 'bg-lime-500/20 border border-lime-500/30 text-lime-400 hover:bg-lime-500/30'

  return (
    <Link
      href="/participar"
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors shrink-0 ${sizing} ${style}`}
    >
      {joined ? <Check size={variant === 'hero' ? 18 : 14} /> : <UserPlus size={variant === 'hero' ? 18 : 14} />}
      {joined ? 'Participando' : 'Participar da temporada'}
    </Link>
  )
}
