'use client'

import { forwardRef, useId } from 'react'
import { cn } from '@/lib/utils'

const CONTROL =
  'focus-ring w-full rounded-2xl border border-line bg-surface/80 px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-faint transition-colors duration-200 hover:border-rose-300/70 disabled:opacity-60'

export interface FieldProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  className?: string
  children: (id: string) => React.ReactNode
}

/** Envelope padrão de rótulo + ajuda + erro para qualquer controle. */
export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId()
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-1 text-rose-500">*</span>}
        </label>
      )}
      {children(id)}
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-faint">{hint}</p>
      ) : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL, className)} {...props} />
  },
)

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(CONTROL, 'min-h-[8rem] resize-y leading-relaxed', className)} {...props} />
  },
)

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(CONTROL, 'appearance-none pr-10', className)} {...props} />
  },
)

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="focus-ring flex w-full items-center justify-between gap-4 rounded-2xl px-1 py-2 text-left disabled:opacity-60"
    >
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-ink-soft">{description}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300',
          checked ? 'bg-rose-500' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300',
            checked ? 'left-[1.375rem]' : 'left-0.5',
          )}
        />
      </span>
    </button>
  )
}

export function TagInput({
  value,
  onChange,
  placeholder = 'Adicionar tag e pressionar Enter',
}: {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-surface/80 p-2">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs text-rose-700"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((t) => t !== tag))}
            className="text-rose-500 transition-colors hover:text-rose-700"
            aria-label={`Remover ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[10rem] flex-1 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-ink-faint"
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          const raw = event.currentTarget.value.trim()
          if (!raw || value.includes(raw)) return
          onChange([...value, raw].slice(0, 20))
          event.currentTarget.value = ''
        }}
      />
    </div>
  )
}
