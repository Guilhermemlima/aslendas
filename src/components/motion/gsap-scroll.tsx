'use client'

import { useRef } from 'react'
import { gsap, movimentoPermitido, setupGsap, useGSAP } from '@/lib/gsap'
import { cn } from '@/lib/utils'

setupGsap()

/**
 * Revela os filhos em sequência conforme entram na tela.
 *
 * Diferente do `whileInView` do Framer Motion, aqui a cascata é calculada uma
 * vez para o grupo inteiro — os itens entram encadeados de verdade, em vez de
 * cada um disparar sozinho quando cruza o limite.
 */
export function ScrollReveal({
  children,
  className,
  seletor = ':scope > *',
  distancia = 28,
  cascata = 0.08,
  inicio = 'top 85%',
}: {
  children: React.ReactNode
  className?: string
  seletor?: string
  distancia?: number
  cascata?: number
  inicio?: string
}) {
  const escopo = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!movimentoPermitido()) return

      const itens = gsap.utils.toArray<HTMLElement>(seletor, escopo.current)
      if (itens.length === 0) return

      gsap.from(itens, {
        y: distancia,
        opacity: 0,
        duration: 0.7,
        stagger: cascata,
        ease: 'power3.out',
        scrollTrigger: { trigger: escopo.current, start: inicio, once: true },
      })
    },
    { scope: escopo, dependencies: [seletor, distancia, cascata, inicio] },
  )

  return (
    <div ref={escopo} className={className}>
      {children}
    </div>
  )
}

/**
 * Parallax suave: o elemento anda mais devagar que a página.
 * Usado na foto de capa da Home para dar profundidade sem chamar atenção.
 */
export function Parallax({
  children,
  className,
  intensidade = 0.18,
}: {
  children: React.ReactNode
  className?: string
  intensidade?: number
}) {
  const escopo = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!movimentoPermitido()) return
      const alvo = escopo.current?.firstElementChild
      if (!alvo) return

      gsap.to(alvo, {
        yPercent: intensidade * 100,
        ease: 'none',
        scrollTrigger: {
          trigger: escopo.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      })
    },
    { scope: escopo, dependencies: [intensidade] },
  )

  return (
    <div ref={escopo} className={cn('overflow-hidden', className)}>
      {children}
    </div>
  )
}

/**
 * Linha vertical que se desenha conforme a pessoa rola — o fio da linha do
 * tempo. É o caso em que o GSAP ganha do Framer Motion com folga: precisa de
 * `scrub`, ou seja, o progresso amarrado à posição do scroll, não ao tempo.
 */
export function ScrollProgressLine({ className }: { className?: string }) {
  const escopo = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const linha = escopo.current?.querySelector('[data-linha]')
      if (!linha) return

      if (!movimentoPermitido()) {
        gsap.set(linha, { scaleY: 1 })
        return
      }

      gsap.fromTo(
        linha,
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: escopo.current?.parentElement,
            start: 'top 70%',
            end: 'bottom 80%',
            scrub: 0.6,
          },
        },
      )
    },
    { scope: escopo },
  )

  return (
    <div ref={escopo} className={className} aria-hidden>
      <div
        data-linha
        className="h-full w-full origin-top bg-gradient-to-b from-rose-300 via-lilac-300 to-transparent"
      />
    </div>
  )
}
