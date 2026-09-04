import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Sorteio simples com semente opcional para resultados estáveis no dia. */
export function pickRandom<T>(items: readonly T[], seed?: number): T | undefined {
  if (items.length === 0) return undefined
  if (seed === undefined) return items[Math.floor(Math.random() * items.length)]
  return items[Math.abs(seed) % items.length]
}

export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/** Semente estável por dia — usada em "memória do dia" e "desafio semanal". */
export function daySeed(date = new Date()): number {
  return Number(
    `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
      date.getDate(),
    ).padStart(2, '0')}`,
  )
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Remove caracteres de controle e limita tamanho antes de gravar texto livre. */
export function sanitizeText(value: string, maxLength = 20000): string {
  const cleaned = Array.from(value)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0
      const isAllowedWhitespace = code === 9 || code === 10 || code === 13
      return isAllowedWhitespace || (code >= 32 && code !== 127)
    })
    .join('')

  return cleaned.slice(0, maxLength).trim()
}

export function pluralize(count: number, one: string, many: string): string {
  return count === 1 ? one : many
}
