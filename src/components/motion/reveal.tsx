'use client'

import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

export interface RevealProps extends HTMLMotionProps<'div'> {
  delay?: number
  /** Direção de entrada. `none` só faz fade. */
  from?: 'bottom' | 'left' | 'right' | 'none'
}

const OFFSETS = {
  bottom: { y: 16, x: 0 },
  left: { y: 0, x: -16 },
  right: { y: 0, x: 16 },
  none: { y: 0, x: 0 },
} as const

/** Entrada suave quando o elemento aparece na tela. Usada em quase toda página. */
export function Reveal({ delay = 0, from = 'bottom', className, children, ...props }: RevealProps) {
  const offset = OFFSETS[from]
  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      whileInView={{ opacity: 1, y: 0, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  )
}

/** Lista com entrada escalonada — cartas, memórias, itens de lista. */
export function Stagger({
  children,
  className,
  gap = 0.06,
}: {
  children: React.ReactNode
  className?: string
  gap?: number
}) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: gap } } }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}
