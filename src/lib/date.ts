import {
  addYears,
  differenceInCalendarDays,
  differenceInYears,
  format,
  formatDistanceToNowStrict,
  isSameDay,
  parseISO,
  setYear,
  startOfDay,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

const LOCALE = { locale: ptBR }

export function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

export function formatDate(value: string | Date, pattern = "d 'de' MMMM 'de' yyyy"): string {
  return format(toDate(value), pattern, LOCALE)
}

export function formatShortDate(value: string | Date): string {
  return format(toDate(value), "d MMM yyyy", LOCALE)
}

export function formatDateTime(value: string | Date): string {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy 'às' HH:mm", LOCALE)
}

export function relativeToNow(value: string | Date): string {
  return formatDistanceToNowStrict(toDate(value), { addSuffix: true, ...LOCALE })
}

/** Detalhamento do tempo de namoro, do jeito que a Home mostra. */
export interface RelationshipTime {
  totalDays: number
  years: number
  months: number
  days: number
  hours: number
  minutes: number
  seconds: number
  nextAnniversary: Date
  daysToAnniversary: number
}

export function relationshipTime(startedAt: string | Date, now = new Date()): RelationshipTime {
  const start = toDate(startedAt)
  const totalDays = Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(start)))

  const years = Math.max(0, differenceInYears(now, start))
  const afterYears = addYears(start, years)
  let months = 0
  const cursor = new Date(afterYears)
  while (true) {
    const next = new Date(cursor)
    next.setMonth(next.getMonth() + 1)
    if (next > now) break
    cursor.setTime(next.getTime())
    months++
  }
  const days = Math.max(0, differenceInCalendarDays(startOfDay(now), startOfDay(cursor)))

  const elapsedMs = now.getTime() - start.getTime()
  const hours = Math.floor(elapsedMs / 3_600_000) % 24
  const minutes = Math.floor(elapsedMs / 60_000) % 60
  const seconds = Math.floor(elapsedMs / 1000) % 60

  const nextAnniversary = nextOccurrence(start, now)

  return {
    totalDays,
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    nextAnniversary,
    daysToAnniversary: differenceInCalendarDays(startOfDay(nextAnniversary), startOfDay(now)),
  }
}

/** Próxima ocorrência anual de uma data (aniversários, datas comemorativas). */
export function nextOccurrence(value: string | Date, from = new Date()): Date {
  const base = toDate(value)
  const candidate = setYear(base, from.getFullYear())
  if (startOfDay(candidate) >= startOfDay(from)) return candidate
  return setYear(base, from.getFullYear() + 1)
}

export function daysUntil(value: string | Date, from = new Date()): number {
  return differenceInCalendarDays(startOfDay(toDate(value)), startOfDay(from))
}

/** Marcos redondos: 100, 500, 1000... dias e cada aniversário de namoro. */
export function nextMilestone(startedAt: string | Date, now = new Date()) {
  const totalDays = relationshipTime(startedAt, now).totalDays
  const steps = [100, 200, 300, 500, 700, 1000, 1500, 2000, 2500, 3000, 5000, 10000]
  const target = steps.find((step) => step > totalDays)
  if (!target) return null
  return { days: target, remaining: target - totalDays }
}

export function isSameDayOfYear(a: string | Date, b: string | Date): boolean {
  const first = toDate(a)
  const second = toDate(b)
  return first.getDate() === second.getDate() && first.getMonth() === second.getMonth()
}

export { isSameDay, startOfDay }

/** Contagem regressiva formatada para cápsulas e surpresas. */
export function countdownParts(target: string | Date, now = new Date()) {
  const diff = Math.max(0, toDate(target).getTime() - now.getTime())
  return {
    done: diff === 0,
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1000) % 60,
  }
}
