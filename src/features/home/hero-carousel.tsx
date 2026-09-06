'use client'

import { useCallback, useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { movimentoPermitido } from '@/lib/gsap'
import { cn } from '@/lib/utils'

export interface HeroPhoto {
  id: string
  url: string
  caption: string | null
}

/**
 * Carrossel da capa da Home.
 *
 * Feito com transição de CSS em vez de biblioteca de animação, de propósito:
 *   * a foto ativa tem `opacity-100` como estado base, então ela aparece mesmo
 *     que nenhuma animação rode (aba oculta, movimento desligado, rAF travado);
 *   * não disputa `transform` com o Parallax do GSAP, que anima o contêiner de
 *     fora — aqui só mexemos em opacidade e num zoom lento próprio.
 */
export function HeroCarousel({
  photos,
  intervaloMs = 6000,
}: {
  photos: HeroPhoto[]
  intervaloMs?: number
}) {
  const [indice, setIndice] = useState(0)
  const [autoplay, setAutoplay] = useState(false)

  // A decisão de animar depende do browser, então só vale depois da montagem —
  // no servidor renderizamos a primeira foto parada.
  useEffect(() => {
    setAutoplay(movimentoPermitido() && photos.length > 1)
  }, [photos.length])

  useEffect(() => {
    if (!autoplay) return
    const timer = setInterval(() => {
      // Pausa sozinho quando a aba sai de foco: evita queimar as fotos todas
      // enquanto ninguém está olhando.
      if (document.hidden) return
      setIndice((atual) => (atual + 1) % photos.length)
    }, intervaloMs)
    return () => clearInterval(timer)
  }, [autoplay, intervaloMs, photos.length])

  const irPara = useCallback((destino: number) => {
    setIndice(destino)
  }, [])

  if (photos.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-romance">
        <Heart className="h-14 w-14 text-rose-300" aria-hidden />
      </div>
    )
  }

  return (
    <div className="absolute inset-0">
      {photos.map((foto, posicao) => {
        const ativa = posicao === indice
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={foto.id}
            src={foto.url}
            alt={foto.caption ?? ''}
            loading={posicao === 0 ? 'eager' : 'lazy'}
            aria-hidden={!ativa}
            className={cn(
              'absolute inset-x-0 -top-[12%] h-[125%] w-full object-cover',
              'transition-opacity duration-[1400ms] ease-in-out motion-reduce:transition-none',
              ativa ? 'opacity-100' : 'opacity-0',
              ativa && autoplay && 'animate-kenburns',
            )}
          />
        )
      })}

      {photos.length > 1 && (
        <div className="absolute bottom-3 right-4 z-10 flex gap-1.5">
          {photos.map((foto, posicao) => (
            <button
              key={foto.id}
              type="button"
              onClick={() => irPara(posicao)}
              aria-label={`Ver foto ${posicao + 1} de ${photos.length}`}
              aria-current={posicao === indice}
              className={cn(
                'focus-ring h-1.5 rounded-full transition-all duration-300',
                posicao === indice ? 'w-5 bg-white/90' : 'w-1.5 bg-white/45 hover:bg-white/70',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
