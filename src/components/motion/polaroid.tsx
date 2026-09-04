'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface PolaroidProps {
  src: string | null
  caption?: string | null
  alt?: string
  rotate?: number
  className?: string
  onClick?: () => void
  priority?: boolean
}

/**
 * Foto em moldura Polaroid, levemente torta, que endireita e cresce no hover.
 * As imagens vêm de signed URLs, então usamos <img> em vez de next/image.
 */
export function Polaroid({ src, caption, alt = '', rotate = -2, className, onClick }: PolaroidProps) {
  return (
    <motion.div
      whileHover={{ rotate: 0, y: -6, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      style={{ rotate }}
      onClick={onClick}
      className={cn('polaroid group cursor-pointer', className)}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-[3px] bg-rose-100">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-rose-300">🖼️</div>
        )}
      </div>
      <p className="mt-2 line-clamp-1 px-1 text-center font-hand text-sm text-ink-soft">
        {caption ?? ''}
      </p>
    </motion.div>
  )
}

/** Pilha de Polaroids da Home — dá profundidade sem custar layout. */
export function PolaroidStack({
  items,
  className,
}: {
  items: { id: string; src: string | null; caption?: string | null }[]
  className?: string
}) {
  return (
    <div className={cn('relative', className)}>
      {items.slice(0, 3).map((item, index) => (
        <div
          key={item.id}
          className="absolute inset-0"
          style={{
            transform: `rotate(${(index - 1) * 5}deg) translateY(${index * 4}px)`,
            zIndex: items.length - index,
          }}
        >
          <Polaroid src={item.src} caption={item.caption} rotate={0} />
        </div>
      ))}
    </div>
  )
}
