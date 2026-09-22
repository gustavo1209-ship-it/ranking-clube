import Image from 'next/image'

interface BrandMarkProps {
  size?: number
  className?: string
}

export function BrandMark({ size = 40, className = '' }: BrandMarkProps) {
  return (
    <Image
      src="/logo-caca-pesca.jpg"
      alt="Caça e Pesca Veranópolis"
      width={size}
      height={size}
      className={`rounded-md bg-white p-0.5 shrink-0 ${className}`}
      priority
    />
  )
}
