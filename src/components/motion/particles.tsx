'use client'

import { useMemo } from 'react'

interface Star {
  id: number
  top: number
  left: number
  size: number
  delay: number
  duration: number
}

/**
 * Camada decorativa de estrelas/partículas atrás do conteúdo.
 * Puramente CSS para não pesar no mobile; desligável nas configurações.
 */
export function Particles({ count = 26, enabled = true }: { count?: number; enabled?: boolean }) {
  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        top: Math.random() * 100,
        left: Math.random() * 100,
        size: 2 + Math.random() * 3,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
      })),
    [count],
  )

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {stars.map((star) => (
        <span
          key={star.id}
          className="absolute animate-twinkle rounded-full bg-gold/60"
          style={{
            top: `${star.top}%`,
            left: `${star.left}%`,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

/** Pétalas caindo devagar — usada no aniversário de namoro. */
export function Petals({ count = 14 }: { count?: number }) {
  const petals = useMemo(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 10 + Math.random() * 8,
        scale: 0.6 + Math.random() * 0.7,
      })),
    [count],
  )

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {petals.map((petal) => (
        <span
          key={petal.id}
          className="absolute -top-8 text-rose-300/70"
          style={{
            left: `${petal.left}%`,
            fontSize: `${petal.scale}rem`,
            animation: `fall ${petal.duration}s linear ${petal.delay}s infinite`,
          }}
        >
          🌸
        </span>
      ))}
      <style>{`
        @keyframes fall {
          0%   { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.9; }
          100% { transform: translateY(110vh) rotate(320deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
