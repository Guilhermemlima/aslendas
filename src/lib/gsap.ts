'use client'

import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

/**
 * Configuração única do GSAP.
 *
 * Divisão de trabalho com o Framer Motion, para as duas bibliotecas não
 * brigarem pelo mesmo elemento:
 *
 *   * Framer Motion — entrada/saída de componentes, `layout`, gestos e modais.
 *     É o que ele faz melhor e continua sendo o padrão do projeto.
 *   * GSAP — coreografia amarrada ao scroll, linhas que se desenham, parallax
 *     e contadores numéricos. Coisas que exigem timeline de verdade.
 *
 * Nunca aplique os dois no mesmo elemento: o Framer Motion escreve em
 * `style.transform` a cada frame e sobrescreve o que o GSAP fez.
 */

let registrado = false

export function setupGsap() {
  if (registrado || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger, useGSAP)

  gsap.defaults({ ease: 'power3.out', duration: 0.8 })

  // Sem isso, o ScrollTrigger calcula posições com a barra de endereço do
  // celular aberta e erra os pontos de disparo quando ela some ao rolar.
  ScrollTrigger.config({ ignoreMobileResize: true })

  registrado = true
}

/**
 * Respeita as duas fontes de "quero menos movimento":
 * a configuração do casal (atributo data-animations no <html>, definido no
 * layout raiz) e a preferência do sistema operacional.
 */
export function movimentoPermitido(): boolean {
  if (typeof window === 'undefined') return false
  if (document.documentElement.dataset.animations === 'off') return false

  // Em aba oculta o requestAnimationFrame não roda, então um tween que começa
  // em opacity 0 deixaria o conteúdo invisível até a aba voltar ao foco — e
  // para sempre, se ela nunca voltar. Melhor entregar o conteúdo pronto e
  // abrir mão da animação: ninguém perde nada por não ver uma entrada suave.
  if (document.hidden) return false

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export { gsap, ScrollTrigger, useGSAP }
