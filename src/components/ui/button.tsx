'use client'

import { forwardRef } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger' | 'outline'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-rose-500 text-white shadow-soft hover:bg-rose-700 active:scale-[0.98] disabled:bg-rose-300',
  secondary:
    'bg-rose-100 text-rose-700 hover:bg-blush active:scale-[0.98] disabled:opacity-60',
  outline:
    'border border-line bg-surface/70 text-ink hover:border-rose-300 hover:bg-rose-50 active:scale-[0.98]',
  ghost: 'text-ink-soft hover:bg-rose-50 hover:text-ink active:scale-[0.98]',
  gold: 'bg-gradient-gold text-white shadow-soft hover:brightness-105 active:scale-[0.98]',
  danger: 'bg-red-500/90 text-white hover:bg-red-600 active:scale-[0.98]',
}

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-full px-3.5 text-sm',
  md: 'h-11 gap-2 rounded-full px-5 text-sm',
  lg: 'h-13 gap-2.5 rounded-full px-7 text-base',
  icon: 'h-10 w-10 rounded-full',
}

const BASE =
  'focus-ring inline-flex select-none items-center justify-center font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-60'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
})

export interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: Variant
  size?: Size
}

export function ButtonLink({ className, variant = 'primary', size = 'md', ...props }: ButtonLinkProps) {
  return <Link className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />
}
