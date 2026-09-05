'use client'

import { useRef } from 'react'
import { gsap, movimentoPermitido, setupGsap, useGSAP } from '@/lib/gsap'

setupGsap()

/**
 * Número que sobe até o valor final quando entra na tela.
 *
 * O texto inicial já é o valor final, então o servidor e o cliente renderizam
 * a mesma coisa (sem divergência de hidratação) e quem tem movimento desligado
 * simplesmente vê o número pronto.
 */
export function CountUp({
  valor,
  duracao = 1.6,
  className,
  sufixo = '',
}: {
  valor: number
  duracao?: number
  className?: string
  sufixo?: string
}) {
  const alvo = useRef<HTMLSpanElement>(null)

  useGSAP(
    () => {
      const elemento = alvo.current
      if (!elemento || !movimentoPermitido()) return

      const contador = { atual: 0 }

      gsap.to(contador, {
        atual: valor,
        duration: duracao,
        ease: 'power2.out',
        // Arredondar a cada frame evita o número tremendo com casas decimais.
        onUpdate: () => {
          elemento.textContent = Math.round(contador.atual).toLocaleString('pt-BR') + sufixo
        },
        scrollTrigger: { trigger: elemento, start: 'top 90%', once: true },
      })
    },
    { dependencies: [valor, duracao, sufixo] },
  )

  return (
    <span ref={alvo} className={className}>
      {valor.toLocaleString('pt-BR')}
      {sufixo}
    </span>
  )
}
